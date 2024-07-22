import React from "react";
import "./Card.scss";

const Card = ({ className, children, onClick }) => {
  return (
    <div className={`card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
