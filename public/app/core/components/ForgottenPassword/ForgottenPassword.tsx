import React, { FC, useState } from 'react';
import { Form, Field, Input, Button, Legend, Container, useStyles, HorizontalGroup, LinkButton } from '@grafana/ui';
import { getBackendSrv } from '@grafana/runtime';
import { css } from 'emotion';
import { GrafanaTheme } from '@grafana/data';

interface EmailDTO {
  userOrEmail: string;
}

const paragraphStyles = (theme: GrafanaTheme) => css`
  color: ${theme.colors.formDescription};
  font-size: ${theme.typography.size.sm};
  font-weight: ${theme.typography.weight.regular};
  margin-top: ${theme.spacing.sm};
  display: block;
`;

export const ForgottenPassword: FC = () => {
  const [emailSent, setEmailSent] = useState(false);
  const styles = useStyles(paragraphStyles);

  const sendEmail = async (formModel: EmailDTO) => {
    const res = await getBackendSrv().post('/api/user/password/send-reset-email', formModel);
    if (res) {
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <div>
        <p>带有重置链接的电子邮件已发送到该电子邮件地址。您应该尽快收到。</p>
        <Container margin="md" />
        <LinkButton variant="primary" href="/login">
          回到登陆
        </LinkButton>
      </div>
    );
  }
  return (
    <Form onSubmit={sendEmail}>
      {({ register, errors }) => (
        <>
          <Legend>重设密码</Legend>
          <Field
            label="User"
            description="输入您的信息以获取发送给您的重置链接"
            invalid={!!errors.userOrEmail}
            error={errors?.userOrEmail?.message}
          >
            <Input placeholder="Email or username" name="userOrEmail" ref={register({ required: true })} />
          </Field>
          <HorizontalGroup>
            <Button>发送重置电子邮件</Button>
            <LinkButton variant="link" href="/login">
              回到登陆
            </LinkButton>
          </HorizontalGroup>

          <p className={styles}>您忘记了用户名或电子邮件吗？请与您的Grafana管理员联系。</p>
        </>
      )}
    </Form>
  );
};
