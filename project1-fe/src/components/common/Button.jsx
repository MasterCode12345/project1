import { Link } from 'react-router-dom';

export default function Button({ children, to, variant = 'primary', className = '', ...props }) {
  const classNames = `btn btn-${variant} ${className}`.trim();

  if (to) {
    return (
      <Link className={classNames} to={to}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
}
