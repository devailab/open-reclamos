export const sidebarNavItemClassName =
	'h-9 rounded-lg font-normal text-muted-foreground transition-[color,background-color,box-shadow] duration-150 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground data-active:bg-sidebar-foreground/8 data-active:font-normal data-active:text-sidebar-foreground data-active:shadow-xs data-active:inset-ring data-active:inset-ring-sidebar-foreground/8 dark:data-active:bg-sidebar-foreground/12 [&>svg]:text-current'

export const sidebarNavGroupClassName = `${sidebarNavItemClassName} data-[current=true]:font-normal data-[current=true]:text-sidebar-foreground group-data-[collapsible=icon]:data-[current=true]:bg-sidebar-foreground/8 dark:group-data-[collapsible=icon]:data-[current=true]:bg-sidebar-foreground/12`

export const sidebarNavSubItemClassName = `${sidebarNavItemClassName} h-8`
