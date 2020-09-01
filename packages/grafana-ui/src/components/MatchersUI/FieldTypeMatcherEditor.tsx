import React, { memo, useMemo, useCallback } from 'react';
import { MatcherUIProps, FieldMatcherUIRegistryItem } from './types';
import { FieldMatcherID, fieldMatchers, SelectableValue, FieldType, DataFrame } from '@grafana/data';
import { Select } from '../Select/Select';

export const FieldTypeMatcherEditor = memo<MatcherUIProps<string>>(props => {
  const { data, options } = props;
  const counts = useFieldCounts(data);
  const selectOptions = useSelectOptions(counts, options);

  const onChange = useCallback(
    (selection: SelectableValue<string>) => {
      return props.onChange(selection.value!);
    },
    [counts, props.onChange]
  );

  const selectedOption = selectOptions.find(v => v.value === options);
  return <Select value={selectedOption} options={selectOptions} onChange={onChange} />;
});

const allTypes: Array<SelectableValue<FieldType>> = [
  { value: FieldType.number, label: 'Numeric' },
  { value: FieldType.string, label: 'String' },
  { value: FieldType.time, label: 'Time' },
  { value: FieldType.boolean, label: 'Boolean' },
  { value: FieldType.trace, label: 'Traces' },
  { value: FieldType.other, label: 'Other' },
];

const useFieldCounts = (data: DataFrame[]): Map<FieldType, number> => {
  return useMemo(() => {
    const counts: Map<FieldType, number> = new Map();
    for (const t of allTypes) {
      counts.set(t.value!, 0);
    }
    for (const frame of data) {
      for (const field of frame.fields) {
        const key = field.type || FieldType.other;
        let v = counts.get(key);
        if (!v) {
          v = 0;
        }
        counts.set(key, v + 1);
      }
    }
    return counts;
  }, [data]);
};

const useSelectOptions = (counts: Map<string, number>, opt?: string): Array<SelectableValue<string>> => {
  return useMemo(() => {
    let found = false;
    const options: Array<SelectableValue<string>> = [];
    for (const t of allTypes) {
      const count = counts.get(t.value!);
      const match = opt === t.value;
      if (count || match) {
        options.push({
          ...t,
          label: `${t.label} (${counts.get(t.value!)})`,
        });
      }
      if (match) {
        found = true;
      }
    }
    if (opt && !found) {
      options.push({
        value: opt,
        label: `${opt} (No matches)`,
      });
    }
    return options;
  }, [counts, opt]);
};

export const fieldTypeMatcherItem: FieldMatcherUIRegistryItem<string> = {
  id: FieldMatcherID.byType,
  component: FieldTypeMatcherEditor,
  matcher: fieldMatchers.get(FieldMatcherID.byType),
  name: '按类型过滤',
  description: '设置与类型匹配的字段的属性',
  optionsToLabel: options => options,
};
