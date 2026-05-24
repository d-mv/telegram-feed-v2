import { Button, Flex, Input, Typography } from "antd";

type PhoneLoginFieldsProps = {
	phone: string;
	code: string;
	codeSent: boolean;
	isSending: boolean;
	isSubmittingCode: boolean;
	onPhoneChange: (value: string) => void;
	onCodeChange: (value: string) => void;
	onSendCode: () => void;
	onSubmitCode: () => void;
	onReset: () => void;
};

export function PhoneLoginFields({
	phone,
	code,
	codeSent,
	isSending,
	isSubmittingCode,
	onPhoneChange,
	onCodeChange,
	onSendCode,
	onSubmitCode,
	onReset,
}: PhoneLoginFieldsProps) {
	return (
		<>
			<div style={{ marginBottom: 12 }}>
				<label htmlFor="login-phone">
					<Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
						Phone
					</Typography.Text>
				</label>
				<Input
					id="login-phone"
					name="phone"
					type="tel"
					placeholder="+1 202 555 0118"
					value={phone}
					onChange={(event) => onPhoneChange(event.target.value)}
					size="large"
				/>
			</div>
			<Button
				type="primary"
				block
				onClick={onSendCode}
				disabled={phone.trim() === "" || isSending}
				loading={isSending}
				size="large"
			>
				{isSending ? "Sending..." : "Send code"}
			</Button>
			{codeSent && (
				<>
					<div style={{ marginBottom: 12, marginTop: 16 }}>
						<label htmlFor="login-code">
							<Typography.Text
								strong
								style={{ display: "block", marginBottom: 4 }}
							>
								Code
							</Typography.Text>
						</label>
						<Input
							id="login-code"
							name="code"
							type="text"
							inputMode="numeric"
							placeholder="12345"
							value={code}
							onChange={(event) => onCodeChange(event.target.value)}
							size="large"
						/>
					</div>
					<Flex gap={8}>
						<Button
							type="primary"
							style={{ flex: 1 }}
							onClick={onSubmitCode}
							disabled={isSubmittingCode || code.trim() === ""}
							loading={isSubmittingCode}
							size="large"
						>
							{isSubmittingCode ? "Submitting..." : "Submit code"}
						</Button>
						<Button type="text" onClick={onReset} size="large">
							Reset
						</Button>
					</Flex>
				</>
			)}
		</>
	);
}
