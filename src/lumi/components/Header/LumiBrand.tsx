import LumiWordmark from './LumiWordmark';
import mandalaSvg from '../../assets/mandala.svg';

export function LumiBrand({ title }: { title: string }) {
  return (
    <>
      <img
        className="header-logo-mark"
        src={mandalaSvg}
        alt=""
        width={32}
        height={32}
      />
      <LumiWordmark className="header-logo-img" title={title} />
    </>
  );
}
