import './Header.css';
import mandalaPng from '../../assets/Мандала.png';

export default function LogoIcon() {
  return (
    <img className="logo-icon-img" src={mandalaPng} alt="" aria-hidden="true" draggable={false} />
  );
}

