import React from 'react';
import { shallow } from 'enzyme';
import AzureCredentialsForm, { Props } from './AzureCredentialsForm';

const setup = (propsFunc?: (props: Props) => Props) => {
  let props: Props = {
    credentials: {
      azureCloud: 'azuremonitor',
      tenantId: 'e7f3f661-a933-3h3f-0294-31c4f962ec48',
      clientId: '34509fad-c0r9-45df-9e25-f1ee34af6900',
      clientSecret: undefined,
    },
    defaultSubscription: '44987801-6nn6-49he-9b2d-9106972f9789',
    azureCloudOptions: [
      { value: 'azuremonitor', label: 'Azure' },
      { value: 'govazuremonitor', label: 'Azure US Government' },
      { value: 'germanyazuremonitor', label: 'Azure Germany' },
      { value: 'chinaazuremonitor', label: 'Azure China' },
    ],
    onCredentialsChange: jest.fn(),
    onDefaultSubscriptionChange: jest.fn(),
    getSubscriptions: jest.fn(),
  };

  if (propsFunc) {
    props = propsFunc(props);
  }

  return shallow(<AzureCredentialsForm {...props} />);
};

describe('Render', () => {
  it('should render component', () => {
    const wrapper = setup();
    expect(wrapper).toMatchSnapshot();
  });

  it('should disable azure monitor secret input', () => {
    const wrapper = setup((props) => ({
      ...props,
      credentials: {
        azureCloud: 'azuremonitor',
        tenantId: 'e7f3f661-a933-3h3f-0294-31c4f962ec48',
        clientId: '34509fad-c0r9-45df-9e25-f1ee34af6900',
        clientSecret: Symbol(),
      },
    }));
    expect(wrapper).toMatchSnapshot();
  });

  it('should enable azure monitor load subscriptions button', () => {
    const wrapper = setup((props) => ({
      ...props,
      credentials: {
        azureCloud: 'azuremonitor',
        tenantId: 'e7f3f661-a933-3h3f-0294-31c4f962ec48',
        clientId: '34509fad-c0r9-45df-9e25-f1ee34af6900',
        clientSecret: 'e7f3f661-a933-4b3f-8176-51c4f982ec48',
      },
    }));
    expect(wrapper).toMatchSnapshot();
  });
});
