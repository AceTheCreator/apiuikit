import type { Meta, StoryObj } from '@storybook/react';
import { SchemaViewer } from '../containers/Schema/SchemaViewer';
import { centeredDecorator } from './documentContextDecorator';

const meta = {
  title: 'Internal/SchemaViewer',
  component: SchemaViewer,
  decorators: [centeredDecorator],
} satisfies Meta<typeof SchemaViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    },
    title: 'User Schema',
  },
};

export const ComplexSchema: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        message: {
          type: 'object',
          properties: {
            payload: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['payload'],
        },
      },
      required: ['id', 'message'],
    },
    title: 'Message Schema',
  },
};
