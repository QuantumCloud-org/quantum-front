import { DynamicIcon, iconNames, type IconName } from 'lucide-react/dynamic'

const iconNameSet = new Set<string>(iconNames)

/** Resolves icons outside the frequently used navigation set. */
export default function BackendMenuIcon({ name }: { name: string }) {
  return iconNameSet.has(name) ? <DynamicIcon name={name as IconName} /> : null
}
