import { Button, Input, Typography } from "antd";

type TwoFactorFormProps = {
  password: string;
  hint: string;
  isSubmitting: boolean;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
};

export function TwoFactorForm({
  password,
  hint,
  isSubmitting,
  onPasswordChange,
  onSubmit,
}: TwoFactorFormProps) {
  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="login-password">
          <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>Password</Typography.Text>
        </label>
        <Input.Password
          id="login-password"
          name="password"
          placeholder="2FA password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          size="large"
        />
        {hint !== "" && (
          <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
            Hint: {hint}
          </Typography.Text>
        )}
      </div>
      <Button
        type="primary"
        block
        onClick={onSubmit}
        disabled={isSubmitting || password.trim() === ""}
        loading={isSubmitting}
        size="large"
      >
        {isSubmitting ? "Submitting..." : "Submit password"}
      </Button>
    </>
  );
}
