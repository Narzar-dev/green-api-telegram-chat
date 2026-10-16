interface AvatarProps {
  title: string;
  small?: boolean;
}

export default function Avatar({ title, small = false }: AvatarProps) {
  const initials = title.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase() || 'TG';
  return <span className={`avatar${small ? ' avatar-small' : ''}`}>{initials}</span>;
}
