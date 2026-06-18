const SIZES = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-20 w-20 text-2xl",
};

export default function Avatar({ url, name, size = "sm" }) {
  const cls = SIZES[size] ?? SIZES.sm;
  const initial = name ? name[0].toUpperCase() : "?";

  if (url) {
    return (
      <img
        src={url}
        alt={name || "Avatar"}
        className={`${cls} rounded-full object-cover shrink-0 border border-[#E5E4E0]`}
      />
    );
  }
  return (
    <div className={`${cls} rounded-full bg-[#E5E4E0] flex items-center justify-center font-semibold text-[#6B6B6B] shrink-0`}>
      {initial}
    </div>
  );
}
