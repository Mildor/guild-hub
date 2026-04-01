import { ImgHTMLAttributes } from 'react';

interface WowIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  name: string;
  size?: number;
}

export function WowIcon({ name, size = 24, className = '', ...props }: WowIconProps) {
  return (
    <img
      src={`https://wow.zamimg.com/images/wow/icons/large/${name.toLowerCase()}.jpg`}
      alt={name}
      width={size}
      height={size}
      className={`rounded-md border border-border ${className}`}
      {...props}
    />
  );
}
