import {
  EnzymeAdapter,
} from 'enzyme';
import Inferno from 'inferno';
import VNodeFlags from 'inferno-vnode-flags';
import InfernoServer from 'inferno-server';
import createElement from 'inferno-create-element';
import {
  mapNativeEventNames,
  throwError,
} from './util';
import toTree from './toTree';

function upperCasefirst(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function isClassComponent(el) {
  return el.flags & VNodeFlags.ClassComponent;
}

class InfernoAdapter extends EnzymeAdapter {
  nodeToHostNode(node) {
    if (node.nodeType === 'class' || node.nodeType === 'function') {
      if (!node.rendered) {
        return node.rendered;
      }
      return Array.isArray(node.rendered) ? node.rendered[0] : node.rendered.instance;
    }
    return node.instance;
  }

  nodeToElement(node) {
    if (!node || typeof node !== 'object') return null;
    return createElement(node.type, node.props);
  }

  elementToNode(el) {
    return toTree(el);
  }

  createElement(...args) {
    return createElement(...args);
  }

  createMountRenderer() {
    const domNode = global.document.createElement('div');
    let instance = null;
    return {
      render(el) {
        if (isClassComponent(el)) {
          instance = Inferno.render(el, domNode);
        } else {
          Inferno.render(el, domNode);
          instance = el;
        }
      },

      unmount() {
        instance.componentWillUnmount.apply(instance);
        instance = null;
      },

      getNode() {
        return instance ? toTree(instance) : null;
      },

      simulateEvent(node, event, ...args) {
        let hostNode = node;
        const eventName = mapNativeEventNames(event);
        if (node.type !== 'host') {
          hostNode = Array.isArray(node.rendered) ? node.rendered[0] : node.rendered;
        }
        const handler = hostNode.props[`on${upperCasefirst(eventName)}`];
        if (handler) {
          handler(...args);
        }
      },
    };
  }
  createStringRenderer() {
    return {
      render(el) {
        return InfernoServer.renderToString(el);
      },
    };
  }

  createRenderer(options) {
    switch (options.mode) {
      case EnzymeAdapter.MODES.MOUNT: return this.createMountRenderer(options);
      case EnzymeAdapter.MODES.SHALLOW: return throwError('shallow is not yet implemented');
      case EnzymeAdapter.MODES.STRING: return this.createStringRenderer(options);
      default:
        throw new Error(`Enzyme Internal Error: Unrecognized mode: ${options.mode}`);
    }
  }
}

module.exports = InfernoAdapter;
