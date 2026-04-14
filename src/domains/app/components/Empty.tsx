import { Empty as AntEmpty } from "antd";

export default function Empty() {
  return (
    <AntEmpty
      description="No recent messages. This feed only shows messages from the last 7 days."
      style={{ padding: "48px 24px" }}
    />
  );
}
