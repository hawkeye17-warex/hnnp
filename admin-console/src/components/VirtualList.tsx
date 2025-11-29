import React from 'react';
import {FixedSizeList as List, ListChildComponentProps} from 'react-window';

type VirtualListProps<T> = {
  items: T[];
  height: number;
  itemHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
};

export function VirtualList<T>({items, height, itemHeight, renderRow}: VirtualListProps<T>) {
  const Row = ({index, style}: ListChildComponentProps) => (
    <div style={style}>{renderRow(items[index], index)}</div>
  );

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      width="100%"
      overscanCount={8}>
      {Row}
    </List>
  );
}
