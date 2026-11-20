import React from 'react';
import {
  Crown,
  Shield,
  Star,
  Gem,
  Flame,
  Bot,
  Skull,
  Clover,
  Zap,
  User,
} from 'lucide-react';

interface AvatarIconProps {
  name?: string;
  className?: string;
  size?: number;
}

export const AVATAR_LIST = [
  'crown',
  'shield',
  'star',
  'gem',
  'flame',
  'tiger',
  'skull',
  'clover',
  'zap',
];

export const AvatarIcon: React.FC<AvatarIconProps> = ({
  name = 'crown',
  className = 'w-6 h-6',
  size = 24,
}) => {
  const iconProps = { className, size };

  switch (name.toLowerCase()) {
    case 'crown':
      return <Crown {...iconProps} />;
    case 'shield':
      return <Shield {...iconProps} />;
    case 'star':
      return <Star {...iconProps} />;
    case 'gem':
      return <Gem {...iconProps} />;
    case 'flame':
      return <Flame {...iconProps} />;
    case 'skull':
      return <Skull {...iconProps} />;
    case 'clover':
      return <Clover {...iconProps} />;
    case 'zap':
    case 'tiger':
      return <Zap {...iconProps} />;
    case 'bot':
      return <Bot {...iconProps} />;
    default:
      return <User {...iconProps} />;
  }
};
