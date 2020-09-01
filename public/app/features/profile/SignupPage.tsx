import React, { FC } from 'react';
import { SignupForm } from './SignupForm';
import Page from 'app/core/components/Page/Page';
import { getConfig } from 'app/core/config';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader';
import { StoreState } from 'app/types';

const navModel = {
  main: {
    icon: 'grafana',
    text: 'Sign Up',
    subTitle: 'Register your Grafana account',
    breadcrumbs: [{ title: 'Login', url: 'login' }],
  },
  node: {
    text: '',
  },
};

interface Props {
  email?: string;
  orgName?: string;
  username?: string;
  code?: string;
  name?: string;
}
export const SignupPage: FC<Props> = props => {
  return (
    <Page navModel={navModel}>
      <Page.Contents>
        <h3 className="p-b-1">您快到了。</h3>
        <div className="p-b-1">
          我们只需要更多的
          <br />
          信息就可以完成创建您的帐户。
        </div>
        <SignupForm
          {...props}
          verifyEmailEnabled={getConfig().verifyEmailEnabled}
          autoAssignOrg={getConfig().autoAssignOrg}
        />
      </Page.Contents>
    </Page>
  );
};

const mapStateToProps = (state: StoreState) => ({
  ...state.location.routeParams,
});

export default hot(module)(connect(mapStateToProps)(SignupPage));
