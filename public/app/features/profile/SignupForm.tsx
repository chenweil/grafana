import React, { FC } from 'react';
import { Button, LinkButton, Input, Form, Field } from '@grafana/ui';
import { css } from 'emotion';

import { getConfig } from 'app/core/config';
import { getBackendSrv } from '@grafana/runtime';

interface SignupFormModel {
  email: string;
  username?: string;
  password: string;
  orgName: string;
  code?: string;
  name?: string;
}
interface Props {
  email?: string;
  orgName?: string;
  username?: string;
  code?: string;
  name?: string;
  verifyEmailEnabled?: boolean;
  autoAssignOrg?: boolean;
}

const buttonSpacing = css`
  margin-left: 15px;
`;

export const SignupForm: FC<Props> = props => {
  const verifyEmailEnabled = props.verifyEmailEnabled;
  const autoAssignOrg = props.autoAssignOrg;

  const onSubmit = async (formData: SignupFormModel) => {
    if (formData.name === '') {
      delete formData.name;
    }

    const response = await getBackendSrv().post('/api/user/signup/step2', {
      email: formData.email,
      code: formData.code,
      username: formData.email,
      orgName: formData.orgName,
      password: formData.password,
      name: formData.name,
    });

    if (response.code === 'redirect-to-select-org') {
      window.location.href = getConfig().appSubUrl + '/profile/select-org?signup=1';
    }
    window.location.href = getConfig().appSubUrl + '/';
  };

  const defaultValues = {
    orgName: props.orgName,
    email: props.email,
    username: props.email,
    code: props.code,
    name: props.name,
  };

  return (
    <Form defaultValues={defaultValues} onSubmit={onSubmit}>
      {({ register, errors }) => {
        return (
          <>
            {verifyEmailEnabled && (
              <Field label="电子邮件验证码（发送到您的电子邮件）">
                <Input name="code" ref={register} placeholder="Code" />
              </Field>
            )}
            {!autoAssignOrg && (
              <Field label="组织名称">
                <Input name="orgName" placeholder="Org. name" ref={register} />
              </Field>
            )}
            <Field label="你的名字">
              <Input name="name" placeholder="(optional)" ref={register} />
            </Field>
            <Field label="Email" invalid={!!errors.email} error={errors.email?.message}>
              <Input
                name="email"
                type="email"
                placeholder="电子邮件"
                ref={register({
                  required: '电子邮件为必填项',
                  pattern: {
                    value: /^\S+@\S+$/,
                    message: '电子邮件无效',
                  },
                })}
              />
            </Field>
            <Field label="密码" invalid={!!errors.password} error={errors.password?.message}>
              <Input name="password" type="password" placeholder="密码" ref={register({ required: '密码必填项' })} />
            </Field>

            <Button type="submit">提交</Button>
            <span className={buttonSpacing}>
              <LinkButton href={getConfig().appSubUrl + '/login'} variant="secondary">
                返回
              </LinkButton>
            </span>
          </>
        );
      }}
    </Form>
  );
};
