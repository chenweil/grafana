import React, { FC } from 'react';
import { LinkButton, VerticalGroup } from '@grafana/ui';
import { css } from 'emotion';

export const UserSignup: FC<{}> = () => {
  return (
    <VerticalGroup
      className={css`
        margin-top: 8px;
      `}
    >
      <span>Grafana新手?</span>
      <LinkButton
        className={css`
          width: 100%;
          justify-content: center;
        `}
        href="signup"
        variant="secondary"
      >
        注册
      </LinkButton>
    </VerticalGroup>
  );
};
