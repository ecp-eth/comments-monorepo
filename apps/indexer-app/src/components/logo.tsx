import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1024 1024"
      width="1rem"
      height="1rem"
      fill="none"
      {...props}
    >
      <g clipPath="url(#a)">
        <path
          fill="#000"
          fillRule="evenodd"
          d="M879.004 511.889c0 203.733-165.183 368.889-368.942 368.889-80.239 0-154.495-25.611-215.037-69.102L79.353 826.245l87.593-178.498c-16.666-42.044-25.827-87.881-25.827-135.858C141.119 308.157 306.301 143 510.062 143c203.759 0 368.942 165.157 368.942 368.889Zm-216.182-8.028-152.601-259.59-152.601 259.59 152.601 94.943 152.601-94.943ZM510.221 752.179 662.98 534.345l-152.759 95.739-153.077-95.739 153.077 217.834Z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="a">
          <path fill="#fff" d="M79 143h800v737.778H79z" />
        </clipPath>
      </defs>
    </svg>
  );
}
