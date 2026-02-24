import { useAtom, useAtomValue, useSetAtom } from "jotai/react";
import { lazy } from "react";
import { menuIsOpenAtom, menuItemAtom, toggleMenuAtom } from "../../atoms/menu.atom";
import styles from "./Menu.module.css";

const NotificationSettings = lazy(() => import("./components/NotificationsSettings"));
const Maintenance = lazy(() => import("./components/Maintenance"));

const MENU_ITEMS = [
  {
    label: "Notifications",
    module: NotificationSettings,
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
  // const [isMenuOpen, setIsMenuOpen] = useState(false);
  // const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // const [isClearingCache, setIsClearingCache] = useState(false);

  // function handleCloseSettings() {
  //   setIsSettingsOpen(false);
  //   setIsMenuOpen(false);
  // }

  // async function handleClearCache() {
  //   setIsClearingCache(true);
  //   try {
  //     await dal.clearCache();
  //   } finally {
  //     setIsClearingCache(false);
  //   }
  // }
  // if (isOpen) {
  //   return null;
  // }

  function renderModule() {
    if (module === null) {
      return null;
    }
    const Module = MENU_ITEMS[module].module;
    return <Module />;
  }

  function handleClick(index: number) {
    return function call() {
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
      {renderModule()}
    </>
  );
}
