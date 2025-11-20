import React from 'react';

import {useTheme} from '../theme/ThemeProvider';

type CardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

const Card = ({children, style}: CardProps) => {
  const {theme} = useTheme();
  const {colors} = theme;

  return (
    <div
      className="card"
      style={{
        background: colors.cardBg,
        borderColor: colors.cardBorder,
        ...style,
      }}>
      {children}
    </div>
  );
};

export default Card;
