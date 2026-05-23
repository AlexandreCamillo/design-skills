import { Button as AntButton } from 'antd';
import type { FC, ReactNode } from 'react';

interface ButtonProps {
  variant?: 'primary' | 'ghost';
  onClick?: () => void;
  children: ReactNode;
}

export const Button: FC<ButtonProps> = ({ variant = 'primary', onClick, children }) => (
  <AntButton type={variant === 'primary' ? 'primary' : 'default'} onClick={onClick}>
    {children}
  </AntButton>
);
