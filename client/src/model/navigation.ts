export type ModuleKey = 'foundation' | 'connectivity' | 'runtime' | 'settings'

export interface MenuItem {
  key: string
  title: string
  path: string
  module: ModuleKey
  description: string
}
