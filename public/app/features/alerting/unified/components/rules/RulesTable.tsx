import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import React, { FC, Fragment, useState } from 'react';
import { isAlertingRule, isRecordingRule } from '../../utils/rules';
import { CollapseToggle } from '../CollapseToggle';
import { css, cx } from '@emotion/css';
import { RuleDetails } from './RuleDetails';
import { getAlertTableStyles } from '../../styles/table';
import { isCloudRulesSource } from '../../utils/datasource';
import { useHasRuler } from '../../hooks/useHasRuler';
import { CombinedRule } from 'app/types/unified-alerting';
import { AlertStateTag } from './AlertStateTag';

interface Props {
  rules: CombinedRule[];
  showGuidelines?: boolean;
  showGroupColumn?: boolean;
  emptyMessage?: string;
  className?: string;
}

export const RulesTable: FC<Props> = ({
  rules,
  className,
  showGuidelines = false,
  emptyMessage = 'No rules found.',
  showGroupColumn = false,
}) => {
  const hasRuler = useHasRuler();

  const styles = useStyles2(getStyles);
  const tableStyles = useStyles2(getAlertTableStyles);

  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const toggleExpandedState = (ruleKey: string) =>
    setExpandedKeys(
      expandedKeys.includes(ruleKey) ? expandedKeys.filter((key) => key !== ruleKey) : [...expandedKeys, ruleKey]
    );

  const wrapperClass = cx(styles.wrapper, className, { [styles.wrapperMargin]: showGuidelines });

  if (!rules.length) {
    return <div className={cx(wrapperClass, styles.emptyMessage)}>{emptyMessage}</div>;
  }

  return (
    <div className={wrapperClass}>
      <table className={tableStyles.table} data-testid="rules-table">
        <colgroup>
          <col className={tableStyles.colExpand} />
          <col className={styles.colState} />
          <col />
          <col />
          <col />
          {showGroupColumn && <col />}
        </colgroup>
        <thead>
          <tr>
            <th className={styles.relative}>
              {showGuidelines && <div className={cx(styles.headerGuideline, styles.guideline)} />}
            </th>
            <th>State</th>
            <th>Name</th>
            {showGroupColumn && <th>Group</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const seenKeys: string[] = [];
            return rules.map((rule, ruleIdx) => {
              const { namespace, group } = rule;
              const { rulesSource } = namespace;
              let key = JSON.stringify([rule.promRule?.type, rule.labels, rule.query, rule.name, rule.annotations]);
              if (seenKeys.includes(key)) {
                key += `-${ruleIdx}`;
              }
              seenKeys.push(key);
              const isExpanded = expandedKeys.includes(key);
              const { promRule, rulerRule } = rule;
              const statuses = [
                promRule?.health,
                hasRuler(rulesSource) && promRule && !rulerRule ? 'deleting' : '',
                hasRuler(rulesSource) && rulerRule && !promRule ? 'creating' : '',
              ].filter((x) => !!x);
              return (
                <Fragment key={key}>
                  <tr className={ruleIdx % 2 === 0 ? tableStyles.evenRow : undefined}>
                    <td className={styles.relative}>
                      {showGuidelines && (
                        <>
                          <div className={cx(styles.ruleTopGuideline, styles.guideline)} />
                          {!(ruleIdx === rules.length - 1) && (
                            <div className={cx(styles.ruleBottomGuideline, styles.guideline)} />
                          )}
                        </>
                      )}
                      <CollapseToggle
                        isCollapsed={!isExpanded}
                        onToggle={() => toggleExpandedState(key)}
                        data-testid="rule-collapse-toggle"
                      />
                    </td>
                    <td>
                      {promRule && isAlertingRule(promRule) ? (
                        <AlertStateTag state={promRule.state} />
                      ) : promRule && isRecordingRule(promRule) ? (
                        'Recording rule'
                      ) : (
                        'n/a'
                      )}
                    </td>
                    <td>{rule.name}</td>
                    {showGroupColumn && (
                      <td>{isCloudRulesSource(rulesSource) ? `${namespace.name} > ${group.name}` : namespace.name}</td>
                    )}
                    <td>{statuses.join(', ') || 'n/a'}</td>
                  </tr>
                  {isExpanded && (
                    <tr className={ruleIdx % 2 === 0 ? tableStyles.evenRow : undefined}>
                      <td className={styles.relative}>
                        {!(ruleIdx === rules.length - 1) && showGuidelines && (
                          <div className={cx(styles.ruleContentGuideline, styles.guideline)} />
                        )}
                      </td>
                      <td colSpan={showGroupColumn ? 4 : 3}>
                        <RuleDetails rulesSource={rulesSource} rule={rule} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );
};

export const getStyles = (theme: GrafanaTheme2) => ({
  wrapperMargin: css`
    margin-left: 36px;
  `,
  emptyMessage: css`
    padding: ${theme.spacing(1)};
  `,
  wrapper: css`
    width: auto;
    background-color: ${theme.colors.background.secondary};
    border-radius: ${theme.shape.borderRadius()};
  `,
  table: css`
    width: 100%;
    border-radius: ${theme.shape.borderRadius()};
    border: solid 1px ${theme.colors.border.weak};
    background-color: ${theme.colors.background.secondary};

    th {
      padding: ${theme.spacing(1)};
    }

    td + td {
      padding: ${theme.spacing(0, 1)};
    }

    tr {
      height: 38px;
    }
  `,
  evenRow: css`
    background-color: ${theme.colors.background.primary};
  `,
  colState: css`
    width: 110px;
  `,
  relative: css`
    position: relative;
  `,
  guideline: css`
    left: -19px;
    border-left: 1px solid ${theme.colors.border.medium};
    position: absolute;
  `,
  ruleTopGuideline: css`
    width: 18px;
    border-bottom: 1px solid ${theme.colors.border.medium};
    top: 0;
    bottom: 50%;
  `,
  ruleBottomGuideline: css`
    top: 50%;
    bottom: 0;
  `,
  ruleContentGuideline: css`
    top: 0;
    bottom: 0;
  `,
  headerGuideline: css`
    top: -24px;
    bottom: 0;
  `,
});
