import debounce from 'lodash/debounce';
import {
  ChevronLeftIcon as TdChevronLeftIcon,
  ChevronRightIcon as TdChevronRightIcon,
  AddIcon as TdAddIcon,
} from 'tdesign-icons-vue';
import type { ComponentPublicInstance } from '@vue/composition-api';
import TTabPanel from './tab-panel';
import TTabNavItem from './tab-nav-item';
import { emitEvent } from '../utils/event';
import { firstUpperCase } from '../utils/helper';
import tabProps from './props';
import { renderTNodeJSX } from '../utils/render-tnode';
import { getClassPrefixMixins, getGlobalIconMixins } from '../config-provider/config-receiver';
import mixins from '../utils/mixins';

import type { TdTabsProps } from './type';

const classPrefixMixins = getClassPrefixMixins('tab__nav');

const getDomWidth = (dom: HTMLElement): number => dom?.offsetWidth || 0;

interface GetLeftCoverWidth {
  leftZone: HTMLElement;
  leftIcon: HTMLElement;
  totalWidthBeforeActiveTab: number;
}

interface GetRightCoverWidth {
  rightZone: HTMLElement;
  rightIcon: HTMLElement;
  wrap: HTMLElement;
  totalWidthBeforeActiveTab: number;
  activeTabWidth: number;
}

// 如果要当前tab左边对齐左操作栏的右边以展示完整的tab，需要获取左边操作栏的宽度
const getLeftCoverWidth = (o: GetLeftCoverWidth) => {
  const leftOperationsZoneWidth = getDomWidth(o.leftZone);
  const leftIconWidth = getDomWidth(o.leftIcon);
  // 判断当前tab是不是第一个tab
  if (o.totalWidthBeforeActiveTab === 0) {
    // 如果是第一个tab要移动到最左边，则要减去左箭头的宽度，因为此时左箭头会被隐藏起来
    return leftOperationsZoneWidth - leftIconWidth;
  }
  return leftOperationsZoneWidth;
};

// 如果要当前tab右边对齐右操作栏的左边以展示完整的tab，需要获取右边操作栏的宽度
const getRightCoverWidth = (o: GetRightCoverWidth) => {
  const rightOperationsZoneWidth = getDomWidth(o.rightZone);
  const rightIconWidth = getDomWidth(o.rightIcon as HTMLElement);
  const wrapWidth = getDomWidth(o.wrap);
  // 判断当前tab是不是最后一个tab，小于1是防止小数像素导致值不相等的情况
  if (Math.abs(o.totalWidthBeforeActiveTab + o.activeTabWidth - wrapWidth) < 1) {
    // 如果是最后一个tab，则要减去右箭头的宽度，因为此时右箭头会被隐藏
    return rightOperationsZoneWidth - rightIconWidth;
  }
  return rightOperationsZoneWidth;
};

export default mixins(classPrefixMixins, getGlobalIconMixins()).extend({
  name: 'TTabNav',
  components: {
    TTabNavItem,
  },
  props: {
    theme: tabProps.theme,
    panels: {
      type: Array as { new (): Array<InstanceType<typeof TTabPanel>> },
      default: (): Array<InstanceType<typeof TTabPanel>> => [] as Array<InstanceType<typeof TTabPanel>>,
    },
    value: tabProps.value,
    placement: tabProps.placement,
    size: tabProps.size,
    disabled: tabProps.disabled,
    addable: tabProps.addable,
  },
  data() {
    return {
      scrollLeft: 0,
      canToLeft: false,
      canToRight: false,
      navBarStyle: {},
    };
  },
  computed: {
    navs(): Array<Record<string, any>> {
      return this.panels.map((panel, index) => ({
        ref: `tabItem${index}`,
        key: panel.value,
        theme: this.theme,
        size: this.size,
        placement: this.placement,
        active: panel.value === this.value,
        disabled: this.disabled || panel.disabled,
        removable: panel.removable,
        value: panel.value,
        panel,
      }));
    },
    wrapTransformStyle(): { [key: string]: string } {
      if (['left', 'right'].includes(this.placement.toLowerCase())) return {};
      return {
        transform: `translate(${-this.scrollLeft}px, 0)`,
      };
    },
    dataCanUpdateNavBarStyle(): Array<any> {
      return [this.scrollLeft, this.placement, this.theme, this.navs, this.value];
    },
    dataCanUpdateArrow(): Array<any> {
      return [this.scrollLeft, this.placement, this.navs];
    },
    iconBaseClass(): { [key: string]: boolean } {
      return {
        [`${this.classPrefix}-tabs__btn`]: true,
        [`${this.classPrefix}-size-m`]: this.size === 'medium',
        [`${this.classPrefix}-size-l`]: this.size === 'large',
      };
    },
    leftIconClass(): { [key: string]: boolean } {
      return {
        [`${this.classPrefix}-tabs__btn--left`]: true,
        ...this.iconBaseClass,
      };
    },
    rightIconClass(): { [key: string]: boolean } {
      return {
        [`${this.classPrefix}-tabs__btn--right`]: true,
        ...this.iconBaseClass,
      };
    },
    addIconClass(): { [key: string]: boolean } {
      return {
        [`${this.classPrefix}-tabs__add-btn`]: true,
        ...this.iconBaseClass,
      };
    },
    navContainerClass(): { [key: string]: boolean } {
      return {
        [`${this.classPrefix}-tabs__nav-container`]: true,
        [`${this.classPrefix}-tabs__nav--card`]: this.theme === 'card',
        [`${this.classPrefix}-is-${this.placement}`]: true,
        [`${this.classPrefix}-is-addable`]: this.theme === 'card' && this.addable,
      };
    },
    navScrollContainerClass(): { [key: string]: boolean } {
      return {
        [`${this.classPrefix}-tabs__nav-scroll`]: true,
        [`${this.classPrefix}-is-scrollable`]: this.canToLeft || this.canToRight,
      };
    },
    navsWrapClass(): Array<string | { [key: string]: boolean }> {
      return [
        `${this.classPrefix}-tabs__nav-wrap`,
        `${this.classPrefix}-is-smooth`,
        { [`${this.classPrefix}-is-vertical`]: this.placement === 'left' || this.placement === 'right' },
      ];
    },
    navBarClass(): Array<string> {
      return [`${this.classPrefix}-tabs__bar`, `${this.classPrefix}-is-${this.placement}`];
    },
    navsContainerStyle(): object {
      return this.addable ? { 'min-height': '48px' } : null;
    },
    activeElement(): HTMLElement {
      const activeIndx = this.navs.findIndex((nav) => nav.active);
      if (activeIndx > -1) {
        return (this.$refs[`tabItem${activeIndx}`] as unknown as ComponentPublicInstance)?.$el;
      }
      return null;
    },
  },
  watch: {
    dataCanUpdateArrow() {
      this.$nextTick(() => {
        this.calculateCanShowArrow();
      });
    },
    dataCanUpdateNavBarStyle() {
      this.$nextTick(() => {
        this.calculateNavBarStyle();
      });
    },
    value() {
      this.$nextTick(() => {
        this.moveActiveTabIntoView();
      });
    },
    navs() {
      this.$nextTick(() => {
        this.fixScrollLeft();
      });
    },
  },
  methods: {
    calculateCanShowArrow() {
      this.calculateCanToLeft();
      this.calculateCanToRight();
    },

    calculateCanToLeft() {
      if (['left', 'right'].includes(this.placement.toLowerCase())) {
        this.canToLeft = false;
      }
      const container = this.$refs.navsContainer as HTMLElement;
      const wrap = this.$refs.navsWrap as HTMLElement;
      if (!wrap || !container) {
        this.canToLeft = false;
      }
      const leftOperationsZoneWidth = getDomWidth(this.$refs.leftOperationsZone as HTMLElement);
      const leftIconWidth = getDomWidth(this.$refs.leftIcon as HTMLElement);
      this.canToLeft = this.scrollLeft + Math.round(leftOperationsZoneWidth - leftIconWidth) > 0;
    },

    calculateCanToRight() {
      if (['left', 'right'].includes(this.placement.toLowerCase())) {
        this.canToRight = false;
      }
      const container = this.$refs.navsContainer as HTMLElement;
      const wrap = this.$refs.navsWrap as HTMLElement;
      if (!wrap || !container) {
        this.canToRight = false;
      }
      const rightOperationsZoneWidth = getDomWidth(this.$refs.rightOperationsZone as HTMLElement);
      const rightIconWidth = getDomWidth(this.$refs.rightIcon as HTMLElement);
      this.canToRight = this.scrollLeft + getDomWidth(container) - (rightOperationsZoneWidth - rightIconWidth) - getDomWidth(wrap) < -1; // 小数像素不精确，所以这里判断小于-1
    },

    calculateNavBarStyle() {
      const getNavBarStyle = () => {
        if (this.theme === 'card') return {};
        const getPropName = () => {
          if (['left', 'right'].includes(this.placement.toLowerCase())) {
            return ['height', 'top'];
          }
          return ['width', 'left'];
        };
        let offset = 0;
        const { activeElement } = this;
        if (!activeElement) return {};

        const [sizePropName, offsetPropName] = getPropName();
        let i = 0;
        for (; i < this.navs.length; i++) {
          if (this.navs[i].active) {
            break;
          }
          offset
            += (this.$refs[`tabItem${i}`] as unknown as ComponentPublicInstance)?.$el?.[
              `client${firstUpperCase(sizePropName)}`
            ] || 0;
        }

        return {
          [offsetPropName]: `${offset}px`,
          [sizePropName]: `${activeElement?.[`client${firstUpperCase(sizePropName)}`] || 0}px`,
        };
      };
      this.navBarStyle = getNavBarStyle();
    },

    calculateMountedScrollLeft() {
      if (['left', 'right'].includes(this.placement.toLowerCase())) return;

      const container = this.$refs.navsContainer as HTMLElement;
      const activeTabEl: HTMLElement = this.activeElement;
      const totalWidthBeforeActiveTab = activeTabEl?.offsetLeft;
      const containerWidth = getDomWidth(container);
      if (totalWidthBeforeActiveTab > containerWidth) this.scrollLeft = totalWidthBeforeActiveTab;
    },

    watchDomChange() {
      const onResize = debounce(() => {
        this.resetScrollPosition();
      }, 300);
      window.addEventListener('resize', onResize);
      this.$once('beforeDestroy', () => {
        window.removeEventListener('resize', onResize);
      });
      if (!this.$refs.navsContainer) return;
      if (!(window as Window & { ResizeObserver?: any }).ResizeObserver) return;
      const resizeObserver = new (window as Window & { ResizeObserver?: any }).ResizeObserver(onResize);
      resizeObserver.observe(this.$refs.navsContainer);
      this.$once('beforeDestroy', () => {
        resizeObserver.disconnect();
      });
    },

    resetScrollPosition() {
      this.fixScrollLeft();
      this.calculateCanShowArrow();
    },

    handleScrollToLeft() {
      const container = this.$refs.navsContainer as HTMLElement;
      if (!container) return;
      const leftOperationsZoneWidth = getDomWidth(this.$refs.leftOperationsZone as HTMLElement);
      const leftIconWidth = getDomWidth(this.$refs.leftIcon as HTMLElement);
      const containerWidth = getDomWidth(container);
      this.scrollLeft = Math.max(-(leftOperationsZoneWidth - leftIconWidth), this.scrollLeft - containerWidth);
    },

    handleScrollToRight() {
      const container = this.$refs.navsContainer as HTMLElement;
      const wrap = this.$refs.navsWrap as HTMLElement;
      const rightOperationsZoneWidth = getDomWidth(this.$refs.rightOperationsZone as HTMLElement);
      const rightIconWidth = getDomWidth(this.$refs.rightIcon as HTMLElement);
      const containerWidth = getDomWidth(container);
      const wrapWidth = getDomWidth(wrap);
      this.scrollLeft = Math.min(
        this.scrollLeft + containerWidth,
        wrapWidth - containerWidth + rightOperationsZoneWidth - rightIconWidth,
      );
    },

    shouldMoveToLeftSide(activeTabEl: HTMLElement) {
      const totalWidthBeforeActiveTab = activeTabEl.offsetLeft;
      const container = this.$refs.navsContainer as HTMLElement;
      if (!container) return;
      const leftCoverWidth = getLeftCoverWidth({
        leftZone: this.$refs.leftOperationsZone as HTMLElement,
        leftIcon: this.$refs.leftIcon as HTMLElement,
        totalWidthBeforeActiveTab,
      });
      // 判断当前tab是不是在左边被隐藏
      const isCurrentTabHiddenInLeftZone = () => this.scrollLeft + leftCoverWidth > totalWidthBeforeActiveTab;
      if (isCurrentTabHiddenInLeftZone()) {
        this.scrollLeft = totalWidthBeforeActiveTab - leftCoverWidth;
        return true;
      }
      return false;
    },

    shouldMoveToRightSide(activeTabEl: HTMLElement) {
      const totalWidthBeforeActiveTab = activeTabEl.offsetLeft;
      const activeTabWidth = activeTabEl.offsetWidth;
      const container = this.$refs.navsContainer as HTMLElement;
      const wrap = this.$refs.navsWrap as HTMLElement;
      if (!container || !wrap) return;
      const containerWidth = getDomWidth(container);
      const rightCoverWidth = getRightCoverWidth({
        rightZone: this.$refs.rightOperationsZone as HTMLElement,
        rightIcon: this.$refs.rightIcon as HTMLElement,
        wrap,
        totalWidthBeforeActiveTab,
        activeTabWidth,
      });
      // 判断当前tab是不是在右边被隐藏
      const isCurrentTabHiddenInRightZone = () => this.scrollLeft + containerWidth - rightCoverWidth < totalWidthBeforeActiveTab + activeTabWidth;
      if (isCurrentTabHiddenInRightZone()) {
        this.scrollLeft = totalWidthBeforeActiveTab + activeTabWidth - containerWidth + rightCoverWidth;
        return true;
      }
      return false;
    },

    moveActiveTabIntoView({ needCheckUpdate } = { needCheckUpdate: true }) {
      if (['left', 'right'].includes(this.placement)) {
        return false;
      }
      const activeTabEl: HTMLElement = this.activeElement;
      if (!activeTabEl) {
        // 如果没有当前 value 对应的tab，一种情况是真没有；一种情况是在修改value的同时，新增了一个值为该value的tab。后者因为navs的更新在$nextTick之后，所以得等下一个updated才能拿到新的tab
        if (needCheckUpdate) {
          this.$once('hook:updated', () => {
            this.moveActiveTabIntoView({ needCheckUpdate: false });
          });
        }
        return false;
      }
      return this.shouldMoveToLeftSide(activeTabEl) || this.shouldMoveToRightSide(activeTabEl);
    },

    fixIfLastItemNotTouchRightSide(containerWidth: number, wrapWidth: number) {
      const rightOperationsZoneWidth = getDomWidth(this.$refs.rightOperationsZone as HTMLElement);
      if (this.scrollLeft + containerWidth - rightOperationsZoneWidth > wrapWidth) {
        this.scrollLeft = wrapWidth + rightOperationsZoneWidth - containerWidth;
        return true;
      }
      return false;
    },

    fixIfItemTotalWidthIsLessThenContainerWidth(containerWidth: number, wrapWidth: number) {
      if (wrapWidth <= containerWidth) {
        this.scrollLeft = 0;
        return true;
      }
      return false;
    },

    fixScrollLeft() {
      if (['left', 'right'].includes(this.placement.toLowerCase())) return;
      const container = this.$refs.navsContainer as HTMLElement;
      const wrap = this.$refs.navsWrap as HTMLElement;
      if (!wrap || !container) return false;
      const containerWidth = getDomWidth(container);
      const wrapWidth = getDomWidth(wrap);
      return (
        this.fixIfItemTotalWidthIsLessThenContainerWidth(containerWidth, wrapWidth)
        || this.fixIfLastItemNotTouchRightSide(containerWidth, wrapWidth)
      );
    },

    handleAddTab(e: MouseEvent) {
      emitEvent<Parameters<TdTabsProps['onAdd']>>(this, 'add', { e });
    },

    tabClick(event: MouseEvent, nav: Partial<InstanceType<typeof TTabPanel>>) {
      const { value, disabled } = nav;
      if (disabled || this.value === value) {
        return false;
      }
      emitEvent<Parameters<TdTabsProps['onChange']>>(this, 'change', value);
    },

    removeBtnClick({ e, value, index }: Parameters<TdTabsProps['onRemove']>[0]) {
      emitEvent<Parameters<TdTabsProps['onRemove']>>(this, 'remove', { e, value, index });
    },
    renderPanelContent() {
      return this.navs.map((panel, index) => (
        <TTabNavItem
          ref={`tabItem${index}`}
          index={index}
          key={panel.value}
          theme={panel.theme}
          size={panel.size}
          placement={panel.placement}
          active={panel.active}
          disabled={panel.disabled}
          removable={panel.removable}
          value={panel.value}
          label={renderTNodeJSX(panel.panel, 'label', `选项卡${index + 1}`)}
          onClick={(e: MouseEvent) => this.tabClick(e, panel.panel)}
          onRemove={this.removeBtnClick}
        ></TTabNavItem>
      ));
    },
    renderArrows() {
      const { ChevronLeftIcon, ChevronRightIcon, AddIcon } = this.useGlobalIcon({
        ChevronLeftIcon: TdChevronLeftIcon,
        ChevronRightIcon: TdChevronRightIcon,
        AddIcon: TdAddIcon,
      });
      return [
        <div
          ref="leftOperationsZone"
          class={[`${this.classPrefix}-tabs__operations`, `${this.classPrefix}-tabs__operations--left`]}
        >
          <transition name="fade" mode="out-in" appear>
            {this.canToLeft ? (
              <div ref="leftIcon" class={this.leftIconClass} onClick={this.handleScrollToLeft}>
                <ChevronLeftIcon />
              </div>
            ) : null}
          </transition>
        </div>,
        <div
          ref="rightOperationsZone"
          class={[`${this.classPrefix}-tabs__operations`, `${this.classPrefix}-tabs__operations--right`]}
        >
          <transition name="fade" mode="out-in" appear>
            {this.canToRight ? (
              <div ref="rightIcon" class={this.rightIconClass} onClick={this.handleScrollToRight}>
                <ChevronRightIcon />
              </div>
            ) : null}
          </transition>
          {this.addable ? (
            <div class={this.addIconClass} onClick={this.handleAddTab}>
              <AddIcon />
            </div>
          ) : null}
        </div>,
      ];
    },
    renderNavs() {
      return (
        <div class={this.navContainerClass}>
          <div class={this.navScrollContainerClass}>
            <div ref="navsWrap" class={this.navsWrapClass} style={this.wrapTransformStyle}>
              {this.renderNavBar()}
              {this.renderPanelContent()}
            </div>
          </div>
        </div>
      );
    },
    renderNavBar() {
      if (this.theme === 'card') return null;
      return <div class={this.navBarClass} style={this.navBarStyle}></div>;
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.watchDomChange();
      this.calculateNavBarStyle();
      this.calculateCanShowArrow();
    });
    setTimeout(() => {
      this.calculateMountedScrollLeft();
    });
  },
  render() {
    return (
      <div ref="navsContainer" class={[`${this.classPrefix}-tabs__nav`]} style={this.navsContainerStyle}>
        {this.renderArrows()}
        {this.renderNavs()}
      </div>
    );
  },
});
