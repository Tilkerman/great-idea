import './Header.css';
import mandalaSvg from '../../assets/mandala.svg';

export default function LogoIcon() {
  return (
    <img className="logo-icon-img" src={mandalaSvg} alt="" aria-hidden="true" draggable={false} />
  );
}

