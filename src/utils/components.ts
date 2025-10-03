import { __tsm } from "../runtime/tsm-runtime.js"

function User() {
    return __tsm(["__TSM_USER__"])
}

function System() {
    return __tsm(["__TSM_SYSTEM__"])
}

function Assistant() {
    return __tsm(["__TSM_ASSISTANT__"])
}

export { User, System, Assistant }