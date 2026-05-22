/**
 * 全局蓝图数据传递模块
 * 用于 image-import 页面向 canvas-editor 页面传递大数据
 * - 不走 URL（长度限制）
 * - 不走 localStorage（容量限制）
 * - 不走事件总线（时序问题）
 * - 直接内存引用传递，零拷贝
 */

/** 蓝图临时数据 */
let blueprintData: any = null

/** 存储蓝图数据 */
export function setBlueprintData(data: any) {
  blueprintData = data
}

/** 读取并清除蓝图数据（一次性读取） */
export function consumeBlueprintData(): any {
  const data = blueprintData
  blueprintData = null
  return data
}
