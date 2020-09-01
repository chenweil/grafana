import React, { FC, useEffect } from 'react';
import { css } from 'emotion';
import { GrafanaTheme, SelectableValue } from '@grafana/data';
import {
  Button,
  Field,
  FormAPI,
  HorizontalGroup,
  InfoBox,
  Input,
  InputControl,
  Select,
  stylesFactory,
  Switch,
  useTheme,
} from '@grafana/ui';
import { NotificationChannel, NotificationChannelDTO } from '../../../types';
import { NotificationChannelOptions } from './NotificationChannelOptions';

interface Props extends Omit<FormAPI<NotificationChannelDTO>, 'formState'> {
  selectableChannels: Array<SelectableValue<string>>;
  selectedChannel?: NotificationChannel;
  imageRendererAvailable: boolean;

  onTestChannel: (data: NotificationChannelDTO) => void;
}

export const NewNotificationChannelForm: FC<Props> = ({
  control,
  errors,
  selectedChannel,
  selectableChannels,
  register,
  watch,
  getValues,
  imageRendererAvailable,
  onTestChannel,
}) => {
  const styles = getStyles(useTheme());

  useEffect(() => {
    watch(['type', 'settings.priority', 'sendReminder', 'uploadImage']);
  }, []);

  const currentFormValues = getValues();
  return (
    <>
      <div className={styles.basicSettings}>
        <Field label="名字" invalid={!!errors.name} error={errors.name && errors.name.message}>
          <Input name="name" ref={register({ required: '名字是必填项' })} />
        </Field>
        <Field label="Type">
          <InputControl
            name="type"
            as={Select}
            options={selectableChannels}
            control={control}
            rules={{ required: true }}
          />
        </Field>
        <Field label="默认" description="将此通知用于所有警报">
          <Switch name="isDefault" ref={register} />
        </Field>
        <Field label="包含图片" description="捕获图像并将其包含在通知中">
          <Switch name="settings.uploadImage" ref={register} />
        </Field>
        {currentFormValues.uploadImage && !imageRendererAvailable && (
          <InfoBox title="没有可用的图像渲染器/未安装">
            Grafana找不到用于渲染通知图像的图像渲染器。 请确保已安装Grafana Image Renderer插件。
            请与您的Grafana管理员联系以安装插件。
          </InfoBox>
        )}
        <Field label="禁用解决消息" description="禁用警报状态返回为false时发送的解决消息[OK]">
          <Switch name="disableResolveMessage" ref={register} />
        </Field>
        <Field label="发送提醒" description="发送其他通知以触发警报">
          <Switch name="sendReminder" ref={register} />
        </Field>
        {currentFormValues.sendReminder && (
          <>
            <Field label="每天发送提醒" description="指定应该多久发送一次提醒，例如 每30s，1m，10m，30m或1h等">
              <Input name="frequency" ref={register} />
            </Field>
            <InfoBox>评估规则后发送警报提醒。 因此，永远不会比配置的警报规则评估间隔更频繁地发送提醒。</InfoBox>
          </>
        )}
      </div>
      {selectedChannel && (
        <NotificationChannelOptions
          selectedChannel={selectedChannel}
          currentFormValues={currentFormValues}
          register={register}
          errors={errors}
          control={control}
        />
      )}
      <HorizontalGroup>
        <Button type="submit">保存</Button>
        <Button type="button" variant="secondary" onClick={() => onTestChannel(getValues({ nest: true }))}>
          测试
        </Button>
        <Button type="button" variant="secondary">
          返回
        </Button>
      </HorizontalGroup>
    </>
  );
};

const getStyles = stylesFactory((theme: GrafanaTheme) => {
  return {
    basicSettings: css`
      margin-bottom: ${theme.spacing.xl};
    `,
  };
});
