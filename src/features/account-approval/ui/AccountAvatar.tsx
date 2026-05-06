interface AccountAvatarProps {
  name: string;
  avatarUrl?: string | null;
}

function AccountAvatar({ name, avatarUrl }: AccountAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-14 w-14 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB] text-sm text-[#212121]">
      {name}
    </div>
  );
}

export default AccountAvatar;
