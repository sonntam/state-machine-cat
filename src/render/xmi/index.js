const Handlebars = require("handlebars/dist/handlebars.runtime");
const makeValidXMLName = require("../scjson/makeValidXMLName");

function type2UML(pType) {
    const UMLTypes = {
        initial: {type: "uml:Pseudostate", kind: "initial"},
        terminate: {type: "uml:Pseudostate", kind: "terminate"},
        regular: {type: "uml:State"},
        choice: {type: "uml:Pseudostate", kind: "choice"},
        forkjoin: {type: "uml:Pseudostate", kind: "fork"},
        fork: {type: "uml:Pseudostate", kind: "fork"},
        join: {type: "uml:Pseudostate", kind: "join"},
        junction: {type: "uml:Pseudostate", kind: "junction"},
        history: {type: "uml:Pseudostate", kind: "history"},
        deephistory: {type: "uml:Pseudostate", kind: "deephistory"},
        final: {type: "uml:Pseudostate", kind: "final"}
    };
    return UMLTypes[pType] || UMLTypes.regular;
}

function nameAnyEvent(pEvent) {
    return pEvent ? {event: makeValidXMLName(pEvent)} : {};
}

function xlateTransitions(pTransitions) {
    return pTransitions
        ? {
            transitions: pTransitions.map(
                (pTransition) => Object.assign(
                    {},
                    pTransition,
                    nameAnyEvent(pTransition.event),
                    {
                        from: makeValidXMLName(pTransition.from),
                        to: makeValidXMLName(pTransition.to)
                    }
                )
            )
        }
        : {};
}

function xlateStates(pStates) {
    return {
        states: pStates.map(
            (pState) => Object.assign(
                {},
                pState,
                {
                    name: pState.label ? makeValidXMLName(pState.label) : makeValidXMLName(pState.name),
                    id: makeValidXMLName(pState.name)
                },
                type2UML(pState.type),
                pState.statemachine ? xlate(pState.statemachine) : {}
            )
        )
    };
}

function xlate(pStateMachine) {
    return Object.assign(
        {},
        xlateStates(pStateMachine.states),
        xlateTransitions(pStateMachine.transitions)
    );
}

/* eslint import/no-unassigned-import: 0 */
require("./xmi.template");
require("./xmi.states.template");

Handlebars.registerPartial(
    'xmi.states.template.hbs',
    Handlebars.templates['xmi.states.template.hbs']
);

module.exports = (pStateMachine) => Handlebars.templates['xmi.template.hbs'](xlate(pStateMachine));
