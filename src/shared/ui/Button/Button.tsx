import { Button as AntButton } from "antd";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "default" | "primary" | "ghost" | "image";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	imgSrc?: string;
	imgAlt?: string;
};

export function Button({
	variant = "default",
	className,
	imgSrc,
	imgAlt,
	children,
	disabled,
	onClick,
	type,
	...props
}: ButtonProps) {
	if (variant === "image") {
		return (
			<button
				type={type ?? "button"}
				className={className}
				disabled={disabled}
				onClick={onClick}
				style={{
					border: "none",
					background: "transparent",
					padding: 0,
					cursor: "pointer",
					display: "inline-flex",
					alignItems: "center",
				}}
				{...props}
			>
				<img src={imgSrc} alt={imgAlt} style={{ width: 24, height: 24 }} />
			</button>
		);
	}

	const antType =
		variant === "primary"
			? "primary"
			: variant === "ghost"
				? "text"
				: "default";

	return (
		<AntButton
			type={antType}
			className={className}
			disabled={disabled}
			onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
			htmlType={type === "submit" ? "submit" : "button"}
			{...(props as object)}
		>
			{children}
		</AntButton>
	);
}
