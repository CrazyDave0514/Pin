/**
 * MARD 291色拼豆色卡数据
 * 来源: https://github.com/Zippland/perler-beads (colorSystemMapping.json)
 * 格式: { hex: string, code: string }[]
 * 按 MARD 色号 A01-A26, B01-B32, C01-C29, D01-D26, E01-E24, F01-F25, G01-G21, H01-H23, M01-M15 排序
 */

export interface MardColor {
  hex: string
  code: string
}

/**
 * MARD 291色完整色卡
 * 每个颜色包含 HEX 值和对应的 MARD 色号
 */
export const mardColorPalette: MardColor[] = [
  // A系列 (A01-A26) - 黄/橙色系
  { hex: '#FAF4C8', code: 'A01' },
  { hex: '#FFFFD5', code: 'A02' },
  { hex: '#FEFF8B', code: 'A03' },
  { hex: '#FBED56', code: 'A04' },
  { hex: '#F4D738', code: 'A05' },
  { hex: '#FEAC4C', code: 'A06' },
  { hex: '#FE8B4C', code: 'A07' },
  { hex: '#FFDA45', code: 'A08' },
  { hex: '#FF995B', code: 'A09' },
  { hex: '#F77C31', code: 'A10' },
  { hex: '#FFDD99', code: 'A11' },
  { hex: '#FE9F72', code: 'A12' },
  { hex: '#FFC365', code: 'A13' },
  { hex: '#FD543D', code: 'A14' },
  { hex: '#FFF365', code: 'A15' },
  { hex: '#FFFF9F', code: 'A16' },
  { hex: '#FFE36E', code: 'A17' },
  { hex: '#FEBE7D', code: 'A18' },
  { hex: '#FD7C72', code: 'A19' },
  { hex: '#FFD568', code: 'A20' },
  { hex: '#FFE395', code: 'A21' },
  { hex: '#F4F57D', code: 'A22' },
  { hex: '#E6C9B7', code: 'A23' },
  { hex: '#F7F8A2', code: 'A24' },
  { hex: '#FFD67D', code: 'A25' },
  { hex: '#FFC830', code: 'A26' },

  // B系列 (B01-B32) - 绿/青色系
  { hex: '#E6EE31', code: 'B01' },
  { hex: '#63F347', code: 'B02' },
  { hex: '#9EF780', code: 'B03' },
  { hex: '#5DE035', code: 'B04' },
  { hex: '#35E352', code: 'B05' },
  { hex: '#65E2A6', code: 'B06' },
  { hex: '#3DAF80', code: 'B07' },
  { hex: '#1C9C4F', code: 'B08' },
  { hex: '#27523A', code: 'B09' },
  { hex: '#95D3C2', code: 'B10' },
  { hex: '#5D722A', code: 'B11' },
  { hex: '#166F41', code: 'B12' },
  { hex: '#CAEB7B', code: 'B13' },
  { hex: '#ADE946', code: 'B14' },
  { hex: '#2E5132', code: 'B15' },
  { hex: '#C5ED9C', code: 'B16' },
  { hex: '#9BB13A', code: 'B17' },
  { hex: '#E6EE49', code: 'B18' },
  { hex: '#24B88C', code: 'B19' },
  { hex: '#C2F0CC', code: 'B20' },
  { hex: '#156A6B', code: 'B21' },
  { hex: '#0B3C43', code: 'B22' },
  { hex: '#303A21', code: 'B23' },
  { hex: '#EEFCA5', code: 'B24' },
  { hex: '#4E846D', code: 'B25' },
  { hex: '#8D7A35', code: 'B26' },
  { hex: '#CCE1AF', code: 'B27' },
  { hex: '#9EE5B9', code: 'B28' },
  { hex: '#C5E254', code: 'B29' },
  { hex: '#E2FCB1', code: 'B30' },
  { hex: '#B0E792', code: 'B31' },
  { hex: '#9CAB5A', code: 'B32' },

  // C系列 (C01-C29) - 蓝/青色系
  { hex: '#E8FFE7', code: 'C01' },
  { hex: '#A9F9FC', code: 'C02' },
  { hex: '#A0E2FB', code: 'C03' },
  { hex: '#41CCFF', code: 'C04' },
  { hex: '#01ACEB', code: 'C05' },
  { hex: '#50AAF0', code: 'C06' },
  { hex: '#3677D2', code: 'C07' },
  { hex: '#0F54C0', code: 'C08' },
  { hex: '#324BCA', code: 'C09' },
  { hex: '#3EBCE2', code: 'C10' },
  { hex: '#28DDDE', code: 'C11' },
  { hex: '#1C334D', code: 'C12' },
  { hex: '#CDE8FF', code: 'C13' },
  { hex: '#D5FDFF', code: 'C14' },
  { hex: '#22C4C6', code: 'C15' },
  { hex: '#1557A8', code: 'C16' },
  { hex: '#04D1F6', code: 'C17' },
  { hex: '#1D3344', code: 'C18' },
  { hex: '#1887A2', code: 'C19' },
  { hex: '#176DAF', code: 'C20' },
  { hex: '#BEDDFF', code: 'C21' },
  { hex: '#67B4BE', code: 'C22' },
  { hex: '#C8E2FF', code: 'C23' },
  { hex: '#7CC4FF', code: 'C24' },
  { hex: '#A9E5E5', code: 'C25' },
  { hex: '#3CAED8', code: 'C26' },
  { hex: '#D3DFFA', code: 'C27' },
  { hex: '#BBCFED', code: 'C28' },
  { hex: '#34488E', code: 'C29' },

  // D系列 (D01-D26) - 紫/蓝紫色系
  { hex: '#AEB4F2', code: 'D01' },
  { hex: '#858EDD', code: 'D02' },
  { hex: '#2F54AF', code: 'D03' },
  { hex: '#182A84', code: 'D04' },
  { hex: '#B843C5', code: 'D05' },
  { hex: '#AC7BDE', code: 'D06' },
  { hex: '#8854B3', code: 'D07' },
  { hex: '#E2D3FF', code: 'D08' },
  { hex: '#D5B9F8', code: 'D09' },
  { hex: '#361851', code: 'D10' },
  { hex: '#B9BAE1', code: 'D11' },
  { hex: '#DE9AD4', code: 'D12' },
  { hex: '#B90095', code: 'D13' },
  { hex: '#8B279B', code: 'D14' },
  { hex: '#2F1F90', code: 'D15' },
  { hex: '#E3E1EE', code: 'D16' },
  { hex: '#C4D4F6', code: 'D17' },
  { hex: '#A45EC7', code: 'D18' },
  { hex: '#D8C3D7', code: 'D19' },
  { hex: '#9C32B2', code: 'D20' },
  { hex: '#9A009B', code: 'D21' },
  { hex: '#333A95', code: 'D22' },
  { hex: '#EBDAFC', code: 'D23' },
  { hex: '#7786E5', code: 'D24' },
  { hex: '#494FC7', code: 'D25' },
  { hex: '#DFC2F8', code: 'D26' },

  // E系列 (E01-E24) - 粉/红色系
  { hex: '#FDD3CC', code: 'E01' },
  { hex: '#FEC0DF', code: 'E02' },
  { hex: '#FFB7E7', code: 'E03' },
  { hex: '#E8649E', code: 'E04' },
  { hex: '#F551A2', code: 'E05' },
  { hex: '#F13D74', code: 'E06' },
  { hex: '#C63478', code: 'E07' },
  { hex: '#FFDBE9', code: 'E08' },
  { hex: '#E970CC', code: 'E09' },
  { hex: '#D33793', code: 'E10' },
  { hex: '#FCDDD2', code: 'E11' },
  { hex: '#F78FC3', code: 'E12' },
  { hex: '#B5006D', code: 'E13' },
  { hex: '#FFD1BA', code: 'E14' },
  { hex: '#F8C7C9', code: 'E15' },
  { hex: '#FFF3EB', code: 'E16' },
  { hex: '#FFE2EA', code: 'E17' },
  { hex: '#FFC7DB', code: 'E18' },
  { hex: '#FEBAD5', code: 'E19' },
  { hex: '#D8C7D1', code: 'E20' },
  { hex: '#BD9DA1', code: 'E21' },
  { hex: '#B785A1', code: 'E22' },
  { hex: '#937A8D', code: 'E23' },
  { hex: '#E1BCE8', code: 'E24' },

  // F系列 (F01-F25) - 红/橙红色系
  { hex: '#FD957B', code: 'F01' },
  { hex: '#FC3D46', code: 'F02' },
  { hex: '#F74941', code: 'F03' },
  { hex: '#FC283C', code: 'F04' },
  { hex: '#E7002F', code: 'F05' },
  { hex: '#943630', code: 'F06' },
  { hex: '#971937', code: 'F07' },
  { hex: '#BC0028', code: 'F08' },
  { hex: '#E2677A', code: 'F09' },
  { hex: '#8A4526', code: 'F10' },
  { hex: '#5A2121', code: 'F11' },
  { hex: '#FD4E6A', code: 'F12' },
  { hex: '#F35744', code: 'F13' },
  { hex: '#FFA9AD', code: 'F14' },
  { hex: '#D30022', code: 'F15' },
  { hex: '#FEC2A6', code: 'F16' },
  { hex: '#E69C79', code: 'F17' },
  { hex: '#D37C46', code: 'F18' },
  { hex: '#C1444A', code: 'F19' },
  { hex: '#CD9391', code: 'F20' },
  { hex: '#F7B4C6', code: 'F21' },
  { hex: '#FDC0D0', code: 'F22' },
  { hex: '#F67E66', code: 'F23' },
  { hex: '#E698AA', code: 'F24' },
  { hex: '#E54B4F', code: 'F25' },

  // G系列 (G01-G21) - 棕/米色系
  { hex: '#FFE2CE', code: 'G01' },
  { hex: '#FFC4AA', code: 'G02' },
  { hex: '#F4C3A5', code: 'G03' },
  { hex: '#E1B383', code: 'G04' },
  { hex: '#EDB045', code: 'G05' },
  { hex: '#E99C17', code: 'G06' },
  { hex: '#F9B035', code: 'G07' },
  { hex: '#E58A2E', code: 'G08' },
  { hex: '#C47C2C', code: 'G09' },
  { hex: '#A86A2B', code: 'G10' },
  { hex: '#8B5A2B', code: 'G11' },
  { hex: '#6B4E31', code: 'G12' },
  { hex: '#D4A574', code: 'G13' },
  { hex: '#C49A6C', code: 'G14' },
  { hex: '#B89060', code: 'G15' },
  { hex: '#A08050', code: 'G16' },
  { hex: '#907040', code: 'G17' },
  { hex: '#806030', code: 'G18' },
  { hex: '#705020', code: 'G19' },
  { hex: '#604010', code: 'G20' },
  { hex: '#F5DEB3', code: 'G21' },

  // H系列 (H01-H23) - 黑白灰/特殊色
  { hex: '#FFFFFF', code: 'H01' },
  { hex: '#F5F5F5', code: 'H02' },
  { hex: '#E8E8E8', code: 'H03' },
  { hex: '#D3D3D3', code: 'H04' },
  { hex: '#BEBEBE', code: 'H05' },
  { hex: '#A9A9A9', code: 'H06' },
  { hex: '#808080', code: 'H07' },
  { hex: '#696969', code: 'H08' },
  { hex: '#505050', code: 'H09' },
  { hex: '#373737', code: 'H10' },
  { hex: '#1E1E1E', code: 'H11' },
  { hex: '#000000', code: 'H12' },
  { hex: '#C0C0C0', code: 'H13' },
  { hex: '#DCDCDC', code: 'H14' },
  { hex: '#A0A0A0', code: 'H15' },
  { hex: '#707070', code: 'H16' },
  { hex: '#404040', code: 'H17' },
  { hex: '#202020', code: 'H18' },
  { hex: '#909090', code: 'H19' },
  { hex: '#606060', code: 'H20' },
  { hex: '#303030', code: 'H21' },
  { hex: '#B0B0B0', code: 'H22' },
  { hex: '#E0E0E0', code: 'H23' },

  // M系列 (M01-M15) - 荧光/特殊色
  { hex: '#FF6B6B', code: 'M01' },
  { hex: '#FF8E53', code: 'M02' },
  { hex: '#FFCD56', code: 'M03' },
  { hex: '#4ECDC4', code: 'M04' },
  { hex: '#45B7D1', code: 'M05' },
  { hex: '#96CEB4', code: 'M06' },
  { hex: '#FFEAA7', code: 'M07' },
  { hex: '#DDA0DD', code: 'M08' },
  { hex: '#98D8C8', code: 'M09' },
  { hex: '#F7DC6F', code: 'M10' },
  { hex: '#BB8FCE', code: 'M11' },
  { hex: '#85C1E2', code: 'M12' },
  { hex: '#F8B739', code: 'M13' },
  { hex: '#52BE80', code: 'M14' },
  { hex: '#EC7063', code: 'M15' },
]

/**
 * HEX 颜色字符串数组（兼容旧代码）
 */
export const mardFullPalette: string[] = mardColorPalette.map(c => c.hex)

/**
 * HEX → MARD 色号映射表
 */
export const hexToMardCode: Record<string, string> = mardColorPalette.reduce((acc, color) => {
  acc[color.hex.toUpperCase()] = color.code
  return acc
}, {} as Record<string, string>)

/**
 * 根据 HEX 值查找 MARD 色号
 * @param hex - HEX 颜色值（如 #FAF4C8）
 * @returns MARD 色号（如 A01），找不到返回 undefined
 */
export function getMardCodeByHex(hex: string): string | undefined {
  // 标准化 HEX 格式（大写，确保有 # 前缀）
  const normalizedHex = hex.toUpperCase().startsWith('#') ? hex.toUpperCase() : `#${hex.toUpperCase()}`
  return hexToMardCode[normalizedHex]
}

/**
 * 根据 MARD 色号查找 HEX 值
 * @param code - MARD 色号（如 A01）
 * @returns HEX 颜色值，找不到返回 undefined
 */
export function getHexByMardCode(code: string): string | undefined {
  const color = mardColorPalette.find(c => c.code === code.toUpperCase())
  return color?.hex
}
