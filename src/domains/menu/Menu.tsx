import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { lazy, Suspense, useContext } from "react";
import { menuIsOpenAtom, menuItemAtom, toggleMenuAtom } from "../../atoms/menu.atom";
import { AppContext } from "../app/AppContext";
import styles from "./Menu.module.css";

const NotificationSettings = lazy(() => import("./components/NotificationsSettings"));
const FiltersSettings = lazy(() => import("./components/FiltersSettings"));
const AvatarsSettings = lazy(() => import("./components/AvatarsSettings"));
const Maintenance = lazy(() => import("./components/Maintenance"));
const SearchDialog = lazy(() => import("./components/SearchDialog"));

const MENU_ITEMS = [
  {
    label: "Refresh",
    action: "refresh",
  },
  {
    label: "Search",
    module: SearchDialog,
  },
  {
    label: "Notifications",
    module: NotificationSettings,
  },
  {
    label: "Filters",
    module: FiltersSettings,
  },
  {
    label: "Avatars",
    module: AvatarsSettings,
  },
  {
    label: "Maintenance",
    module: Maintenance,
  },
];

export function Menu() {
  const toggleMenu = useSetAtom(toggleMenuAtom);
  const [module, setModule] = useAtom(menuItemAtom);
  const isMenuOpen = useAtomValue(menuIsOpenAtom);
  const { onManualRefresh } = useContext(AppContext);

  function renderModule() {
    if (module === null) {
      return null;
    }
    const menuItem = MENU_ITEMS[module];
    if (!("module" in menuItem)) {
      return null;
    }
    const Module = menuItem.module;

    if (Module) return <Module />;

    return null;
  }

  function handleClick(index: number) {
    return function call() {
      if ("action" in MENU_ITEMS[index] && MENU_ITEMS[index].action === "refresh") {
        onManualRefresh();
        toggleMenu();
        return;
      }
      setModule(index);
      toggleMenu();
    };
  }

  function renderMenuItem(item: { label: string }, index: number) {
    return (
      <button
        type="button"
        key={item.label}
        className={styles["menu-item"]}
        role="menuitem"
        onClick={handleClick(index)}
      >
        <p className={styles["menu-item-text"]}>{item.label}</p>
      </button>
    );
  }

  function renderMenu() {
    if (!isMenuOpen) return null;

    return (
      <div className={styles.dropdown} role="menu">
        {MENU_ITEMS.map(renderMenuItem)}
      </div>
    );
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={toggleMenu}>
        Menu
      </button>
      {renderMenu()}
      <Suspense fallback={null}>{renderModule()}</Suspense>
    </>
  );
}
