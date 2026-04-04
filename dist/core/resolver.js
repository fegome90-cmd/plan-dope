import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
export function resolveProjectRoot(projectPath) {
    if (projectPath) {
        const resolved = projectPath.startsWith('~')
            ? join(process.env.HOME || '', projectPath.slice(1))
            : projectPath;
        if (!existsSync(resolved)) {
            throw new Error(`Project path does not exist: ${resolved}`);
        }
        return resolved;
    }
    // Use cwd
    const cwd = process.cwd();
    if (!existsSync(cwd)) {
        throw new Error('Current working directory does not exist');
    }
    return cwd;
}
export function getPlanDir(projectRoot, planId) {
    return join(projectRoot, '_ctx', 'plans', planId);
}
export function getPlansDir(projectRoot) {
    return join(projectRoot, '_ctx', 'plans');
}
export function findPlanId(projectRoot, planId) {
    if (planId) {
        const dir = getPlanDir(projectRoot, planId);
        if (!existsSync(join(dir, 'plan.md'))) {
            throw new Error(`Plan '${planId}' not found at ${dir}`);
        }
        return planId;
    }
    const plansDir = getPlansDir(projectRoot);
    if (!existsSync(plansDir)) {
        throw new Error('No plans found. Run `plan create` first.');
    }
    const dirs = readdirSync(plansDir).filter((d) => existsSync(join(plansDir, d, 'plan.md')));
    if (dirs.length === 0) {
        throw new Error('No plans found. Run `plan create` first.');
    }
    return dirs.sort().pop();
}
//# sourceMappingURL=resolver.js.map