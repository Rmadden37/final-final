/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
      toHaveAttribute(attr: string, value?: string): R;
      toHaveClass(...classNames: string[]): R;
      toHaveTextContent(text: string | RegExp): R;
      toBeVisible(): R;
      toBeEnabled(): R;
      toBeDisabled(): R;
      toBeChecked(): R;
      toHaveFocus(): R;
      toHaveValue(value: string | number): R;
    }
  }
}

export {};
