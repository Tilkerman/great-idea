import LumiWordmark from './LumiWordmark';

export function LumiBrand({ title }: { title: string }) {
  return (
    <>
      <img
        className="header-logo-mark"
        src={`${import.meta.env.BASE_URL}icon-lumi-192.png`}
        alt=""
        width={32}
        height={32}
      />
      <LumiWordmark className="header-logo-img" title={title} />
    </>
  );
}
