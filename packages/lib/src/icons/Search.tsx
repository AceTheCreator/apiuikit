import React from "react";

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width={18}
    height={18}
    viewBox="0 0 16 16"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="7" cy="7" r="5" />
    <path d="M14 14l-3.5-3.5" />
  </svg>
);

export default SearchIcon;
