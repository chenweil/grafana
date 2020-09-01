import React, { PureComponent } from 'react';
import { connect, MapDispatchToProps, MapStateToProps } from 'react-redux';
import { css } from 'emotion';
import { Alert, Button, IconName, CustomScrollbar, Container, HorizontalGroup, ConfirmModal, Modal } from '@grafana/ui';
import { selectors } from '@grafana/e2e-selectors';
import { AngularComponent, getAngularLoader, getDataSourceSrv } from '@grafana/runtime';
import { getAlertingValidationMessage } from './getAlertingValidationMessage';

import EmptyListCTA from 'app/core/components/EmptyListCTA/EmptyListCTA';
import StateHistory from './StateHistory';
import 'app/features/alerting/AlertTabCtrl';

import { DashboardModel } from '../dashboard/state/DashboardModel';
import { PanelModel } from '../dashboard/state/PanelModel';
import { TestRuleResult } from './TestRuleResult';
import { AppNotificationSeverity, StoreState } from 'app/types';
import { updateLocation } from 'app/core/actions';
import { PanelEditorTabId } from '../dashboard/components/PanelEditor/types';

interface OwnProps {
  dashboard: DashboardModel;
  panel: PanelModel;
}

interface ConnectedProps {
  angularPanelComponent?: AngularComponent | null;
}

interface DispatchProps {
  updateLocation: typeof updateLocation;
}

export type Props = OwnProps & ConnectedProps & DispatchProps;

interface State {
  validatonMessage: string;
  showStateHistory: boolean;
  showDeleteConfirmation: boolean;
  showTestRule: boolean;
}

class UnConnectedAlertTab extends PureComponent<Props, State> {
  element: any;
  component: AngularComponent;
  panelCtrl: any;

  state: State = {
    validatonMessage: '',
    showStateHistory: false,
    showDeleteConfirmation: false,
    showTestRule: false,
  };

  componentDidMount() {
    this.loadAlertTab();
  }

  onAngularPanelUpdated = () => {
    this.forceUpdate();
  };

  componentDidUpdate(prevProps: Props) {
    this.loadAlertTab();
  }

  componentWillUnmount() {
    if (this.component) {
      this.component.destroy();
    }
  }

  async loadAlertTab() {
    const { panel, angularPanelComponent } = this.props;

    if (!this.element || !angularPanelComponent || this.component) {
      return;
    }

    const scope = angularPanelComponent.getScope();

    // When full page reloading in edit mode the angular panel has on fully compiled & instantiated yet
    if (!scope.$$childHead) {
      setTimeout(() => {
        this.forceUpdate();
      });
      return;
    }

    this.panelCtrl = scope.$$childHead.ctrl;
    const loader = getAngularLoader();
    const template = '<alert-tab />';

    const scopeProps = { ctrl: this.panelCtrl };

    this.component = loader.load(this.element, scopeProps, template);

    const validatonMessage = await getAlertingValidationMessage(
      panel.transformations,
      panel.targets,
      getDataSourceSrv(),
      panel.datasource
    );

    if (validatonMessage) {
      this.setState({ validatonMessage });
    }
  }

  onAddAlert = () => {
    this.panelCtrl._enableAlert();
    this.component.digest();
    this.forceUpdate();
  };

  switchToQueryTab = () => {
    const { updateLocation } = this.props;
    updateLocation({ query: { tab: PanelEditorTabId.Query }, partial: true });
  };

  onToggleModal = (prop: keyof Omit<State, 'validatonMessage'>) => {
    const value = this.state[prop];
    this.setState({ ...this.state, [prop]: !value });
  };

  renderValidationMessage = () => {
    const { validatonMessage } = this.state;

    return (
      <div
        className={css`
          width: 508px;
          margin: 128px auto;
        `}
      >
        <h2>{validatonMessage}</h2>
        <br />
        <div className="gf-form-group">
          <Button size={'md'} variant={'secondary'} icon="arrow-left" onClick={this.switchToQueryTab}>
            Go back to Queries
          </Button>
        </div>
      </div>
    );
  };

  renderTestRule = () => {
    if (!this.state.showTestRule) {
      return null;
    }

    const { panel, dashboard } = this.props;
    const onDismiss = () => this.onToggleModal('showTestRule');

    return (
      <Modal isOpen={true} icon="bug" title="Testing rule" onDismiss={onDismiss} onClickBackdrop={onDismiss}>
        <TestRuleResult panel={panel} dashboard={dashboard} />
      </Modal>
    );
  };

  renderDeleteConfirmation = () => {
    if (!this.state.showDeleteConfirmation) {
      return null;
    }

    const { panel } = this.props;
    const onDismiss = () => this.onToggleModal('showDeleteConfirmation');

    return (
      <ConfirmModal
        isOpen={true}
        icon="trash-alt"
        title="删除"
        body={
          <div>
            您确定要删除此警报规则吗？
            <br />
            <small>您需要保存仪表板才能使删除生效。</small>
          </div>
        }
        confirmText="删除警报"
        onDismiss={onDismiss}
        onConfirm={() => {
          delete panel.alert;
          panel.thresholds = [];
          this.panelCtrl.alertState = null;
          this.panelCtrl.render();
          this.component.digest();
          onDismiss();
        }}
      />
    );
  };

  renderStateHistory = () => {
    if (!this.state.showStateHistory) {
      return null;
    }

    const { panel, dashboard } = this.props;
    const onDismiss = () => this.onToggleModal('showStateHistory');

    return (
      <Modal isOpen={true} icon="history" title="状态历史" onDismiss={onDismiss} onClickBackdrop={onDismiss}>
        <StateHistory
          dashboard={dashboard}
          panelId={panel.editSourceId ?? panel.id}
          onRefresh={() => this.panelCtrl.refresh()}
        />
      </Modal>
    );
  };

  render() {
    const { alert, transformations } = this.props.panel;
    const { validatonMessage } = this.state;
    const hasTransformations = transformations && transformations.length > 0;

    if (!alert && validatonMessage) {
      return this.renderValidationMessage();
    }

    const model = {
      title: '面板未定义警报规则',
      buttonIcon: 'bell' as IconName,
      onClick: this.onAddAlert,
      buttonTitle: '创建警报',
    };

    return (
      <>
        <CustomScrollbar autoHeightMin="100%">
          <Container padding="md">
            <div aria-label={selectors.components.AlertTab.content}>
              {alert && hasTransformations && (
                <Alert severity={AppNotificationSeverity.Error} title="警报查询不支持转换" />
              )}

              <div ref={element => (this.element = element)} />
              {alert && (
                <HorizontalGroup>
                  <Button onClick={() => this.onToggleModal('showStateHistory')} variant="secondary">
                    状态历史
                  </Button>
                  <Button onClick={() => this.onToggleModal('showTestRule')} variant="secondary">
                    测试规则
                  </Button>
                  <Button onClick={() => this.onToggleModal('showDeleteConfirmation')} variant="destructive">
                    删除
                  </Button>
                </HorizontalGroup>
              )}
              {!alert && !validatonMessage && <EmptyListCTA {...model} />}
            </div>
          </Container>
        </CustomScrollbar>

        {this.renderTestRule()}
        {this.renderDeleteConfirmation()}
        {this.renderStateHistory()}
      </>
    );
  }
}

const mapStateToProps: MapStateToProps<ConnectedProps, OwnProps, StoreState> = (state, props) => {
  return {
    angularPanelComponent: state.dashboard.panels[props.panel.id].angularComponent,
  };
};

const mapDispatchToProps: MapDispatchToProps<DispatchProps, OwnProps> = { updateLocation };

export const AlertTab = connect(mapStateToProps, mapDispatchToProps)(UnConnectedAlertTab);
