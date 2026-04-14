import { Button, Dropdown } from "antd";
import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { lazy, Suspense, useContext } from "react";
import { menuIsOpenAtom, menuItemAtom, toggleMenuAtom } from "../../atoms/menu.atom";
import { AppContext } from "../app/AppContext";
import AvatarsSettings from "./components/AvatarsSettings";
import FiltersSettings from "./components/FiltersSettings";
import Maintenance from "./components/Maintenance";
import NotificationsSettings from "./components/NotificationsSettings";

const SearchDialog = lazy(() => import("./components/SearchDialog"));

const MENU_ITEMS = [
  { label: "Refresh", action: "refresh" },
  { label: "Search", module: SearchDialog },
  { label: "Notifications", module: NotificationsSettings },
  { label: "Filters", module: FiltersSettings },
  { label: "Avatars", module: AvatarsSettings },
  { label: "Maintenance", module: Maintenance },
];

export function Menu() {
  const toggleMenu = useSetAtom(toggleMenuAtom);
  const [module, setModule] = useAtom(menuItemAtom);
  const isMenuOpen = useAtomValue(menuIsOpenAtom);
  const { onManualRefresh } = useContext(AppContext);

  function renderModule() {
    if (module === null) return null;
    const menuItem = MENU_ITEMS[module];
    if (!("module" in menuItem)) return null;
    const Module = menuItem.module;
    if (Module) return <Module />;
    return null;
  }

  const dropdownItems = MENU_ITEMS.map((item, index) => ({
    key: String(index),
    label: item.label,
    onClick: () => {
      if ("action" in item && item.action === "refresh") {
        onManualRefresh();
        if (isMenuOpen) toggleMenu();
        return;
      }
      setModule(index);
      if (!isMenuOpen) toggleMenu();
    },
  }));

  return (
    <>
      <Dropdown
        menu={{ items: dropdownItems }}
        trigger={["click"]}
        open={isMenuOpen}
        onOpenChange={(open) => {
          if (open !== isMenuOpen) toggleMenu();
        }}
      >
        <Button onClick={(e) => e.preventDefault()}>Menu</Button>
      </Dropdown>
      <Suspense fallback={null}>{renderModule()}</Suspense>
    </>
  );
}
