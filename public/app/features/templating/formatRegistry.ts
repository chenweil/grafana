import kbn from 'app/core/utils/kbn';
import { Registry, RegistryItem, VariableModel, textUtil, dateTime } from '@grafana/data';
import { map, isArray, replace } from 'lodash';

export interface FormatRegistryItem extends RegistryItem {
  formatter(value: any, args: string[], variable: VariableModel): string;
}

export const formatRegistry = new Registry<FormatRegistryItem>(() => {
  const formats: FormatRegistryItem[] = [
    {
      id: 'lucene',
      name: 'Lucene',
      description: '值是Lucene转义的，并且多值变量生成OR表达式',
      formatter: value => {
        if (typeof value === 'string') {
          return luceneEscape(value);
        }

        if (value instanceof Array && value.length === 0) {
          return '__empty__';
        }

        const quotedValues = map(value, (val: string) => {
          return '"' + luceneEscape(val) + '"';
        });

        return '(' + quotedValues.join(' OR ') + ')';
      },
    },
    {
      id: 'raw',
      name: 'raw',
      description: '保持价值不变',
      formatter: value => value,
    },
    {
      id: 'regex',
      name: 'Regex',
      description: '值是正则表达式转义的，并且多值变量生成（<value> | <value>）表达式',
      formatter: value => {
        if (typeof value === 'string') {
          return kbn.regexEscape(value);
        }

        const escapedValues = map(value, kbn.regexEscape);
        if (escapedValues.length === 1) {
          return escapedValues[0];
        }
        return '(' + escapedValues.join('|') + ')';
      },
    },
    {
      id: 'pipe',
      name: 'Pipe',
      description: '值之间用|分隔字符',
      formatter: value => {
        if (typeof value === 'string') {
          return value;
        }
        return value.join('|');
      },
    },
    {
      id: 'distributed',
      name: 'Distributed',
      description: '多个值的格式如variable = value',
      formatter: (value, args, variable) => {
        if (typeof value === 'string') {
          return value;
        }

        value = map(value, (val: any, index: number) => {
          if (index !== 0) {
            return variable.name + '=' + val;
          } else {
            return val;
          }
        });
        return value.join(',');
      },
    },
    {
      id: 'csv',
      name: 'Csv',
      description: '逗号分隔值',
      formatter: (value, args, variable) => {
        if (isArray(value)) {
          return value.join(',');
        }
        return value;
      },
    },
    {
      id: 'html',
      name: 'HTML',
      description: 'HTML值的转义',
      formatter: (value, args, variable) => {
        if (isArray(value)) {
          return textUtil.escapeHtml(value.join(', '));
        }
        return textUtil.escapeHtml(value);
      },
    },
    {
      id: 'json',
      name: 'JSON',
      description: 'JSON字符串化值',
      formatter: (value, args, variable) => {
        return JSON.stringify(value);
      },
    },
    {
      id: 'percentencode',
      name: 'Percent encode',
      description: '有用的网址转义值',
      formatter: (value, args, variable) => {
        // like glob, but url escaped
        if (isArray(value)) {
          return encodeURIComponentStrict('{' + value.join(',') + '}');
        }
        return encodeURIComponentStrict(value);
      },
    },
    {
      id: 'singlequote',
      name: 'Single quote',
      description: '单引号',
      formatter: (value, args, variable) => {
        // escape single quotes with backslash
        const regExp = new RegExp(`'`, 'g');
        if (isArray(value)) {
          return map(value, (v: string) => `'${replace(v, regExp, `\\'`)}'`).join(',');
        }
        return `'${replace(value, regExp, `\\'`)}'`;
      },
    },
    {
      id: 'doublequote',
      name: 'Double quote',
      description: '双引号',
      formatter: (value, args, variable) => {
        // escape double quotes with backslash
        const regExp = new RegExp('"', 'g');
        if (isArray(value)) {
          return map(value, (v: string) => `"${replace(v, regExp, '\\"')}"`).join(',');
        }
        return `"${replace(value, regExp, '\\"')}"`;
      },
    },
    {
      id: 'sqlstring',
      name: 'SQL string',
      description: '在IN语句和其他情况下使用的SQL字符串引号和逗号',
      formatter: (value, args, variable) => {
        // escape single quotes by pairing them
        const regExp = new RegExp(`'`, 'g');
        if (isArray(value)) {
          return map(value, v => `'${replace(v, regExp, "''")}'`).join(',');
        }
        return `'${replace(value, regExp, "''")}'`;
      },
    },
    {
      id: 'date',
      name: 'Date',
      description: '以不同方式格式化日期',
      formatter: (value, args, variable) => {
        const arg = args[0] ?? 'iso';

        switch (arg) {
          case 'ms':
            return value;
          case 'seconds':
            return `${Math.round(parseInt(value, 10)! / 1000)}`;
          case 'iso':
            return dateTime(parseInt(value, 10)).toISOString();
          default:
            return dateTime(parseInt(value, 10)).format(arg);
        }
      },
    },
    {
      id: 'glob',
      name: 'Glob',
      description: '使用glob语法设置多值变量的格式，例如{value1，value2}',
      formatter: (value, args, variable) => {
        if (isArray(value) && value.length > 1) {
          return '{' + value.join(',') + '}';
        }
        return value;
      },
    },
  ];

  return formats;
});

function luceneEscape(value: string) {
  return value.replace(/([\!\*\+\-\=<>\s\&\|\(\)\[\]\{\}\^\~\?\:\\/"])/g, '\\$1');
}

/**
 * encode string according to RFC 3986; in contrast to encodeURIComponent()
 * also the sub-delims "!", "'", "(", ")" and "*" are encoded;
 * unicode handling uses UTF-8 as in ECMA-262.
 */
function encodeURIComponentStrict(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c => {
    return (
      '%' +
      c
        .charCodeAt(0)
        .toString(16)
        .toUpperCase()
    );
  });
}
