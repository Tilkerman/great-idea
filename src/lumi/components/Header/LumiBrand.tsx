import LumiWordmark from './LumiWordmark';
import mandalaPng from '../../assets/Мандала.png';

export function LumiBrand({ title }: { title: string }) {
  return (
    <>
      <img
        className="header-logo-mark"
        src={mandalaPng}
        alt=""
        width={32}
        height={32}
      />
      <LumiWordmark className="header-logo-img" title={title} />
    </>
  );
}
