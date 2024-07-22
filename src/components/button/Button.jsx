import React from "react";
import PropTypes from "prop-types";

import "./button.scss";

const Button = (props) => {
  return (
    <button
      className={`btn ${props.className}`}
      onClick={props.onClick ? () => props.onClick() : null}
    >
      {props.icon && <span className="button-icon">{props.icon}</span>}
      {props.children}
    </button>
  );
};

export const OutlineButton = (props) => {
  return (
    <Button
      className={`btn-outline ${props.className}`}
      onClick={props.onClick ? () => props.onClick() : null}
    >
      {props.icon && <span className="button-icon">{props.icon}</span>}
      {props.children}
    </Button>
  );
};

Button.propTypes = {
  onClick: PropTypes.func,
  icon: PropTypes.element,
};

export default Button;