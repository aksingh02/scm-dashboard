import { Routes } from '@angular/router';
import { Layout } from './shared/components/layout/layout';
import { Articles } from './components/articles/articles';
import { ArticleEditor } from './components/articles/article-editor/article-editor';
import { Categories } from './components/articles/categories/categories';
import { Authors } from './components/authors/authors';
import { AuthGuard, RoleGuard } from './shared/guards/auth.guard';
import { Login } from './auth/login/login';
import { PublisherDashboard } from './components/dashboard/publisher-dashboard/publisher-dashboard';
import { EditorDashboard } from './components/dashboard/editor-dashboard/editor-dashboard';
import { AdminDashboard } from './components/dashboard/admin-dashboard/admin-dashboard';
import { AuthorDashboard } from './components/dashboard/author-dashboard/author-dashboard';
import { JournalistDashboard } from './components/dashboard/journalist-dashboard/journalist-dashboard';
import { RoleDashboardResolver } from './shared/resolvers/role-dashboard.resolver';

export const routes: Routes = [
    // Public routes (no authentication required)
    {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: Login,
        title: 'Login - SCM Dashboard'
    },
    {
        path: 'register',
        loadComponent: () => import('./auth/register/register').then(m => m.Register),
        title: 'Register - SCM Dashboard'
    },
    {
        path: 'forgot-password',
        loadComponent: () => import('./auth/forgot-password/forgot-password').then(m => m.ForgotPassword),
        title: 'Forgot Password - SCM Dashboard'
    },
    {
        path: 'unauthorized',
        loadComponent: () => import('./errors/unauthorized/unauthorized').then(m => m.Unauthorized),
        title: 'Unauthorized - SCM Dashboard'
    },

    // Protected routes (authentication required)
    {
        path: '',
        component: Layout,
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        children: [
            {
                path: '',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            // Dynamic dashboard routing based on role
            {
                path: 'dashboard',
                resolve: { dashboardComponent: RoleDashboardResolver },
                loadComponent: () => import('./components/dashboard/dynamic-dashboard/dynamic-dashboard').then(m => m.DynamicDashboard),
                title: 'Dashboard - SCM Dashboard'
            },
            // Role-specific dashboard routes (optional direct access)
            {
                path: 'dashboard/admin',
                component: AdminDashboard,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN'] },
                title: 'Admin Dashboard - SCM Dashboard'
            },
            {
                path: 'dashboard/publisher',
                component: PublisherDashboard,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN', 'PUBLISHER'] },
                title: 'Publisher Dashboard - SCM Dashboard'
            },
            {
                path: 'dashboard/editor',
                component: EditorDashboard,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN', 'EDITOR'] },
                title: 'Editor Dashboard - SCM Dashboard'
            },
            {
                path: 'dashboard/author',
                component: AuthorDashboard,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN', 'AUTHOR'] },
                title: 'Author Dashboard - SCM Dashboard'
            },
            {
                path: 'dashboard/journalist',
                component: JournalistDashboard,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER'] },
                title: 'Journalist Dashboard - SCM Dashboard'
            },
            
            // Content management routes
            {
                path: 'articles',
                component: Articles,
                title: 'Articles - SCM Dashboard'
            },
            {
                path: 'articles/new',
                component: ArticleEditor,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN', 'PUBLISHER', 'EDITOR', 'AUTHOR', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER'] },
                title: 'New Article - SCM Dashboard'
            },
            {
                path: 'articles/edit/:id',
                component: ArticleEditor,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN', 'PUBLISHER', 'EDITOR', 'AUTHOR', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER'] },
                title: 'Edit Article - SCM Dashboard'
            },
            
            // Admin and Editor only routes
            {
                path: 'categories',
                component: Categories,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN', 'PUBLISHER', 'EDITOR'] },
                title: 'Categories - SCM Dashboard'
            },
            
            // Admin only routes
            {
                path: 'authors',
                component: Authors,
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN'] },
                title: 'Authors - SCM Dashboard'
            },
            {
                path: 'reports',
                loadComponent: () => import('./components/management/reports/reports').then(m => m.Reports),
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN'] },
                title: 'Reports - SCM Dashboard'
            },
            {
                path: 'analytics',
                loadComponent: () => import('./components/management/analytics/analytics').then(m => m.Analytics),
                canActivate: [RoleGuard],
                data: { roles: ['ADMIN'] },
                title: 'Analytics - SCM Dashboard'
            },
            
            // User profile routes (available to all authenticated users)
            {
                path: 'settings',
                loadComponent: () => import('./components/user/settings/settings').then(m => m.Settings),
                title: 'Settings - SCM Dashboard'
            },
            {
                path: 'profile',
                loadComponent: () => import('./components/user/profile/profile').then(m => m.Profile),
                title: 'Profile - SCM Dashboard'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'login'
    },
];