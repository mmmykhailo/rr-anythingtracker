export function scrollParentToChild(
  parent: HTMLElement,
  child: HTMLElement,
  scrollMargin = 32
): void {
  if (!parent || !child) {
    console.error("Parent or child element not found");
    return;
  }

  const parentRect = parent.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();

  const relativeTop = childRect.top - parentRect.top + parent.scrollTop;
  const relativeLeft = childRect.left - parentRect.left + parent.scrollLeft;
  const relativeBottom = relativeTop + childRect.height;
  const relativeRight = relativeLeft + childRect.width;

  const isAboveViewport = relativeTop < parent.scrollTop;
  const isBelowViewport =
    relativeBottom > parent.scrollTop + parent.clientHeight;
  const isLeftOfViewport = relativeLeft < parent.scrollLeft;
  const isRightOfViewport =
    relativeRight > parent.scrollLeft + parent.clientWidth;

  const scrollOptions: ScrollToOptions = {
    behavior: "smooth",
  };

  if (isAboveViewport) {
    scrollOptions.top = relativeTop - scrollMargin;
  } else if (isBelowViewport) {
    scrollOptions.top = relativeBottom - parent.clientHeight + scrollMargin;
  }

  if (isLeftOfViewport) {
    scrollOptions.left = relativeLeft - scrollMargin;
  } else if (isRightOfViewport) {
    scrollOptions.left = relativeRight - parent.clientWidth + scrollMargin;
  }

  console.log(scrollOptions, parent);

  parent.scrollTo(scrollOptions);
}
