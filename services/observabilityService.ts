
import { config } from './config';
import * as Sentry from "@sentry/react";

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'FATAL';

interface LogPayload {
    component: string;
    action: string;
    traceId?: string;
    userId?: string;
    metadata?: Record<string, any>;
    error?: Error;
}

class ObservabilityService {
    private static instance: ObservabilityService;
    private traceId: string;

    private constructor() {
        this.traceId = Math.random().toString(36).substring(7);
        this.init();
    }

    public static getInstance(): ObservabilityService {
        if (!ObservabilityService.instance) ObservabilityService.instance = new ObservabilityService();
        return ObservabilityService.instance;
    }

    private init() {
        if (config.isMockEnabled) {
            console.info(`[OBSERVABILITY] Signal Active • Trace: ${this.traceId}`);
        }
    }

    public setUserContext(userId: string, email?: string) {
        Sentry.setUser({ id: userId, email });
    }

    /**
     * STRUCTURED LOGGING
     * Core forensics for launch day survival.
     */
    public log(level: LogLevel, payload: LogPayload) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            traceId: this.traceId,
            ...payload,
            metadata: {
                ...payload.metadata,
                url: window.location.href,
                agent: navigator.userAgent
            }
        };

        // Standard JSON logging for log aggregation services
        if (config.env === 'development') {
            console.log(`[${level}]`, entry);
        }

        if (level === 'ERROR' || level === 'FATAL') {
            this.captureException(payload.error || new Error(payload.action), entry);
        }
        
        // Track as Breadcrumb in Sentry
        Sentry.addBreadcrumb({
            category: payload.component,
            message: payload.action,
            level: level.toLowerCase() as any,
            data: payload.metadata
        });
    }

    /**
     * ERROR TRACKING
     */
    public captureException(error: Error, context?: any) {
        if (config.isMockEnabled) {
            console.warn(`[SENTRY_MOCK] Exception Captured: ${error.message}`, context);
            return;
        }
        
        Sentry.withScope((scope) => {
            if (context) scope.setExtras(context);
            Sentry.captureException(error);
        });
    }

    /**
     * PRODUCT ANALYTICS
     */
    public track(event: string, properties?: Record<string, any>) {
        Sentry.captureMessage(`Analytics: ${event}`, {
            level: 'info',
            extra: properties
        });
    }

    /**
     * PERFORMANCE MONITORING
     */
    public measure(label: string, fn: () => void) {
        const start = performance.now();
        fn();
        const end = performance.now();
        this.log('DEBUG', {
            component: 'Performance',
            action: 'ExecutionTime',
            metadata: { label, durationMs: end - start }
        });
    }
}

export const obs = ObservabilityService.getInstance();
