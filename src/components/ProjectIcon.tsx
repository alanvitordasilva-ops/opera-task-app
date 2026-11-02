import React from 'react';
import {
  Briefcase,
  User,
  Book,
  Code,
  Star,
  Target,
  Zap,
  Heart,
  ShoppingBag,
  Folder,
  CheckCircle2,
} from 'lucide-react';

interface ProjectIconProps {
  iconName: string;
  className?: string;
  style?: React.CSSProperties;
}

export const ProjectIcon: React.FC<ProjectIconProps> = ({ iconName, className = 'w-4 h-4', style }) => {
  switch (iconName) {
    case 'briefcase':
      return <Briefcase className={className} style={style} />;
    case 'user':
      return <User className={className} style={style} />;
    case 'book':
      return <Book className={className} style={style} />;
    case 'code':
      return <Code className={className} style={style} />;
    case 'star':
      return <Star className={className} style={style} />;
    case 'target':
      return <Target className={className} style={style} />;
    case 'zap':
      return <Zap className={className} style={style} />;
    case 'heart':
      return <Heart className={className} style={style} />;
    case 'shopping-bag':
      return <ShoppingBag className={className} style={style} />;
    case 'check':
      return <CheckCircle2 className={className} style={style} />;
    case 'folder':
    default:
      return <Folder className={className} style={style} />;
  }
};
