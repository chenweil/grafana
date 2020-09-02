package notifiers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/bus"
	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/models"
	"github.com/grafana/grafana/pkg/services/alerting"
	"github.com/grafana/grafana/pkg/setting"
)

func init() {
	alerting.RegisterNotifier(&alerting.NotifierPlugin{
		Type:        "slack",
		Name:        "Slack",
		Description: "Sends notifications to Slack via Slack Webhooks",
		Heading:     "Slack settings",
		Factory:     NewSlackNotifier,
		OptionsTemplate: `
      <h3 class="page-heading">Slack设置</h3>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">地址</span>
        <div class="gf-form gf-form--grow" ng-if="!ctrl.model.secureFields.url">
					<input type="text"
						required
						class="gf-form-input max-width-30"
						ng-init="ctrl.model.secureSettings.url = ctrl.model.settings.url || null; ctrl.model.settings.url = null;"
						ng-model="ctrl.model.secureSettings.url"
						placeholder="Slack incoming webhook url">
					</input>
        </div>
        <div class="gf-form" ng-if="ctrl.model.secureFields.url">
          <input type="text" class="gf-form-input max-width-18" disabled="disabled" value="configured" />
          <a class="btn btn-secondary gf-form-btn" href="#" ng-click="ctrl.model.secureFields.url = false">重置</a>
        </div>
      </div>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">Recipient</span>
        <input type="text"
          class="gf-form-input max-width-30"
          ng-model="ctrl.model.settings.recipient"
          data-placement="right">
        </input>
        <info-popover mode="right-absolute">
		覆盖默认频道或用户，请使用＃channel-name，@ username（必须全部为小写字母，不能使用空格）或用户/频道的Slack ID
        </info-popover>
      </div>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">用户名</span>
        <input type="text"
          class="gf-form-input max-width-30"
          ng-model="ctrl.model.settings.username"
          data-placement="right">
        </input>
        <info-popover mode="right-absolute">
		设置机器人消息的用户名
        </info-popover>
      </div>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">图标表情符号</span>
        <input type="text"
          class="gf-form-input max-width-30"
          ng-model="ctrl.model.settings.icon_emoji"
          data-placement="right">
        </input>
        <info-popover mode="right-absolute">
		提供一个表情符号，用作机器人消息的图标。 覆盖图标URL
        </info-popover>
      </div>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">图标地址L</span>
        <input type="text"
          class="gf-form-input max-width-30"
          ng-model="ctrl.model.settings.icon_url"
          data-placement="right">
        </input>
        <info-popover mode="right-absolute">
		提供图像的URL，用作机器人消息的图标
        </info-popover>
      </div>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">提及用户</span>
        <input type="text"
          class="gf-form-input max-width-30"
          ng-model="ctrl.model.settings.mentionUsers"
          data-placement="right">
        </input>
        <info-popover mode="right-absolute">
		在频道中通过ID通知一个或多个用户（以逗号分隔）（您可以从用户的Slack个人资料中复制该内容）
        </info-popover>
      </div>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">提及组</span>
        <input type="text"
          class="gf-form-input max-width-30"
          ng-model="ctrl.model.settings.mentionGroups"
          data-placement="right">
        </input>
        <info-popover mode="right-absolute">
		在频道中进行通知时提及一个或多个组（以逗号分隔）（您可以从组的Slack个人资料网址中复制该组）
        </info-popover>
      </div>
      <div class="gf-form max-width-30">
        <span class="gf-form-label width-8">提及频道</span>
        <select
          class="gf-form-input max-width-30"
          ng-model="ctrl.model.settings.mentionChannel"
          data-placement="right">
		  <option value="">禁用</option>
		  <option value="here">每个活跃频道成员</option>
		  <option value="channel">每个频道成员</option>
        </select>
        <info-popover mode="right-absolute">
		通知时提及整个频道或活跃会员
        </info-popover>
      </div>
      <div class="gf-form max-width-30">
        <div class="gf-form gf-form--v-stretch"><label class="gf-form-label width-8">令牌</label></div>
        <div class="gf-form gf-form--grow" ng-if="!ctrl.model.secureFields.token">
          <input type="text"
						class="gf-form-input max-width-30"
						ng-init="ctrl.model.secureSettings.token = ctrl.model.settings.token || null; ctrl.model.settings.token = null;"
            ng-model="ctrl.model.secureSettings.token"
            data-placement="right">
          </input>
          <info-popover mode="right-absolute">
		  提供一个机器人令牌以使用Slack file.upload API（以"xoxb"开头）。 指定收件人才能使用
          </info-popover>
        </div>
        <div class="gf-form" ng-if="ctrl.model.secureFields.token">
          <input type="text" class="gf-form-input max-width-18" disabled="disabled" value="configured" />
          <a class="btn btn-secondary gf-form-btn" href="#" ng-click="ctrl.model.secureFields.token = false">重置</a>
        </div>
      </div>
    `,
		Options: []alerting.NotifierOption{
			{
				Label:        "Url",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Placeholder:  "Slack incoming webhook url",
				PropertyName: "url",
				Required:     true,
			},
			{
				Label:        "Recipient",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Description:  "Override default channel or user, use #channel-name, @username (has to be all lowercase, no whitespace), or user/channel Slack ID",
				PropertyName: "recipient",
			},
			{
				Label:        "Username",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Description:  "Set the username for the bot's message",
				PropertyName: "username",
			},
			{
				Label:        "Icon emoji",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Description:  "Provide an emoji to use as the icon for the bot's message. Overrides the icon URL.",
				PropertyName: "icon_emoji",
			},
			{
				Label:        "Icon URL",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Description:  "Provide a URL to an image to use as the icon for the bot's message",
				PropertyName: "icon_url",
			},
			{
				Label:        "Mention Users",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Description:  "Mention one or more users (comma separated) when notifying in a channel, by ID (you can copy this from the user's Slack profile)",
				PropertyName: "mentionUsers",
			},
			{
				Label:        "Mention Groups",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Description:  "Mention one or more groups (comma separated) when notifying in a channel (you can copy this from the group's Slack profile URL)",
				PropertyName: "mentionGroups",
			},
			{
				Label:   "Mention Channel",
				Element: alerting.ElementTypeSelect,
				SelectOptions: []alerting.SelectOption{
					{
						Value: "",
						Label: "Disabled",
					},
					{
						Value: "here",
						Label: "Every active channel member",
					},
					{
						Value: "channel",
						Label: "Every channel member",
					},
				},
				Description:  "Mention whole channel or just active members when notifying",
				PropertyName: "mentionChannel",
			},
			{
				Label:        "Token",
				Element:      alerting.ElementTypeInput,
				InputType:    alerting.InputTypeText,
				Description:  "Provide a bot token to use the Slack file.upload API (starts with \"xoxb\"). Specify Recipient for this to work",
				PropertyName: "token",
			},
		},
	})
}

var reRecipient *regexp.Regexp = regexp.MustCompile("^((@[a-z0-9][a-zA-Z0-9._-]*)|(#[^ .A-Z]{1,79})|([a-zA-Z0-9]+))$")

// NewSlackNotifier is the constructor for the Slack notifier
func NewSlackNotifier(model *models.AlertNotification) (alerting.Notifier, error) {
	url := model.DecryptedValue("url", model.Settings.Get("url").MustString())
	if url == "" {
		return nil, alerting.ValidationError{Reason: "Could not find url property in settings"}
	}

	recipient := strings.TrimSpace(model.Settings.Get("recipient").MustString())
	if recipient != "" && !reRecipient.MatchString(recipient) {
		return nil, alerting.ValidationError{Reason: fmt.Sprintf("Recipient on invalid format: %q", recipient)}
	}
	username := model.Settings.Get("username").MustString()
	iconEmoji := model.Settings.Get("icon_emoji").MustString()
	iconURL := model.Settings.Get("icon_url").MustString()
	mentionUsersStr := model.Settings.Get("mentionUsers").MustString()
	mentionGroupsStr := model.Settings.Get("mentionGroups").MustString()
	mentionChannel := model.Settings.Get("mentionChannel").MustString()
	token := model.DecryptedValue("token", model.Settings.Get("token").MustString())

	uploadImage := model.Settings.Get("uploadImage").MustBool(true)

	if mentionChannel != "" && mentionChannel != "here" && mentionChannel != "channel" {
		return nil, alerting.ValidationError{
			Reason: fmt.Sprintf("Invalid value for mentionChannel: %q", mentionChannel),
		}
	}
	mentionUsers := []string{}
	for _, u := range strings.Split(mentionUsersStr, ",") {
		u = strings.TrimSpace(u)
		if u != "" {
			mentionUsers = append(mentionUsers, u)
		}
	}
	mentionGroups := []string{}
	for _, g := range strings.Split(mentionGroupsStr, ",") {
		g = strings.TrimSpace(g)
		if g != "" {
			mentionGroups = append(mentionGroups, g)
		}
	}

	return &SlackNotifier{
		NotifierBase:   NewNotifierBase(model),
		URL:            url,
		Recipient:      recipient,
		Username:       username,
		IconEmoji:      iconEmoji,
		IconURL:        iconURL,
		MentionUsers:   mentionUsers,
		MentionGroups:  mentionGroups,
		MentionChannel: mentionChannel,
		Token:          token,
		Upload:         uploadImage,
		log:            log.New("alerting.notifier.slack"),
	}, nil
}

// SlackNotifier is responsible for sending
// alert notification to Slack.
type SlackNotifier struct {
	NotifierBase
	URL            string
	Recipient      string
	Username       string
	IconEmoji      string
	IconURL        string
	MentionUsers   []string
	MentionGroups  []string
	MentionChannel string
	Token          string
	Upload         bool
	log            log.Logger
}

// Notify send alert notification to Slack.
func (sn *SlackNotifier) Notify(evalContext *alerting.EvalContext) error {
	sn.log.Info("Executing slack notification", "ruleId", evalContext.Rule.ID, "notification", sn.Name)

	ruleURL, err := evalContext.GetRuleURL()
	if err != nil {
		sn.log.Error("Failed get rule link", "error", err)
		return err
	}

	fields := make([]map[string]interface{}, 0)
	fieldLimitCount := 4
	for index, evt := range evalContext.EvalMatches {
		fields = append(fields, map[string]interface{}{
			"title": evt.Metric,
			"value": evt.Value,
			"short": true,
		})
		if index > fieldLimitCount {
			break
		}
	}

	if evalContext.Error != nil {
		fields = append(fields, map[string]interface{}{
			"title": "Error message",
			"value": evalContext.Error.Error(),
			"short": false,
		})
	}

	mentionsBuilder := strings.Builder{}
	appendSpace := func() {
		if mentionsBuilder.Len() > 0 {
			mentionsBuilder.WriteString(" ")
		}
	}
	mentionChannel := strings.TrimSpace(sn.MentionChannel)
	if mentionChannel != "" {
		mentionsBuilder.WriteString(fmt.Sprintf("<!%s|%s>", mentionChannel, mentionChannel))
	}
	if len(sn.MentionGroups) > 0 {
		appendSpace()
		for _, g := range sn.MentionGroups {
			mentionsBuilder.WriteString(fmt.Sprintf("<!subteam^%s>", g))
		}
	}
	if len(sn.MentionUsers) > 0 {
		appendSpace()
		for _, u := range sn.MentionUsers {
			mentionsBuilder.WriteString(fmt.Sprintf("<@%s>", u))
		}
	}
	msg := ""
	if evalContext.Rule.State != models.AlertStateOK { //don't add message when going back to alert state ok.
		msg = evalContext.Rule.Message
	}
	imageURL := ""
	// default to file.upload API method if a token is provided
	if sn.Token == "" {
		imageURL = evalContext.ImagePublicURL
	}

	var blocks []map[string]interface{}
	if mentionsBuilder.Len() > 0 {
		blocks = []map[string]interface{}{
			{
				"type": "section",
				"text": map[string]interface{}{
					"type": "mrkdwn",
					"text": mentionsBuilder.String(),
				},
			},
		}
	}
	attachment := map[string]interface{}{
		"color":       evalContext.GetStateModel().Color,
		"title":       evalContext.GetNotificationTitle(),
		"title_link":  ruleURL,
		"text":        msg,
		"fallback":    evalContext.GetNotificationTitle(),
		"fields":      fields,
		"footer":      "Grafana v" + setting.BuildVersion,
		"footer_icon": "https://grafana.com/assets/img/fav32.png",
		"ts":          time.Now().Unix(),
	}
	if sn.NeedsImage() && imageURL != "" {
		attachment["image_url"] = imageURL
	}
	body := map[string]interface{}{
		"text": evalContext.GetNotificationTitle(),
		"attachments": []map[string]interface{}{
			attachment,
		},
		"parse": "full", // to linkify urls, users and channels in alert message.
	}
	if len(blocks) > 0 {
		body["blocks"] = blocks
	}

	//recipient override
	if sn.Recipient != "" {
		body["channel"] = sn.Recipient
	}
	if sn.Username != "" {
		body["username"] = sn.Username
	}
	if sn.IconEmoji != "" {
		body["icon_emoji"] = sn.IconEmoji
	}
	if sn.IconURL != "" {
		body["icon_url"] = sn.IconURL
	}
	data, err := json.Marshal(&body)
	if err != nil {
		return err
	}

	cmd := &models.SendWebhookSync{
		Url:        sn.URL,
		Body:       string(data),
		HttpMethod: http.MethodPost,
	}
	if sn.Token != "" {
		sn.log.Debug("Adding authorization header to HTTP request")
		cmd.HttpHeader = map[string]string{
			"Authorization": fmt.Sprintf("Bearer %s", sn.Token),
		}
	}
	if err := bus.DispatchCtx(evalContext.Ctx, cmd); err != nil {
		sn.log.Error("Failed to send slack notification", "error", err, "webhook", sn.Name)
		return err
	}
	if sn.Token != "" && sn.UploadImage {
		err = slackFileUpload(evalContext, sn.log, "https://slack.com/api/files.upload", sn.Recipient, sn.Token)
		if err != nil {
			return err
		}
	}
	return nil
}

func slackFileUpload(evalContext *alerting.EvalContext, log log.Logger, url string, recipient string, token string) error {
	if evalContext.ImageOnDiskPath == "" {
		evalContext.ImageOnDiskPath = filepath.Join(setting.HomePath, "public/img/mixed_styles.png")
	}
	log.Info("Uploading to slack via file.upload API")
	headers, uploadBody, err := generateSlackBody(evalContext.ImageOnDiskPath, token, recipient)
	if err != nil {
		return err
	}
	cmd := &models.SendWebhookSync{Url: url, Body: uploadBody.String(), HttpHeader: headers, HttpMethod: "POST"}
	if err := bus.DispatchCtx(evalContext.Ctx, cmd); err != nil {
		log.Error("Failed to upload slack image", "error", err, "webhook", "file.upload")
		return err
	}
	return nil
}

func generateSlackBody(file string, token string, recipient string) (map[string]string, bytes.Buffer, error) {
	// Slack requires all POSTs to files.upload to present
	// an "application/x-www-form-urlencoded" encoded querystring
	// See https://api.slack.com/methods/files.upload
	var b bytes.Buffer
	w := multipart.NewWriter(&b)
	// Add the generated image file
	f, err := os.Open(file)
	if err != nil {
		return nil, b, err
	}
	defer f.Close()
	fw, err := w.CreateFormFile("file", file)
	if err != nil {
		return nil, b, err
	}
	_, err = io.Copy(fw, f)
	if err != nil {
		return nil, b, err
	}
	// Add the authorization token
	err = w.WriteField("token", token)
	if err != nil {
		return nil, b, err
	}
	// Add the channel(s) to POST to
	err = w.WriteField("channels", recipient)
	if err != nil {
		return nil, b, err
	}
	w.Close()
	headers := map[string]string{
		"Content-Type":  w.FormDataContentType(),
		"Authorization": "auth_token=\"" + token + "\"",
	}
	return headers, b, nil
}
