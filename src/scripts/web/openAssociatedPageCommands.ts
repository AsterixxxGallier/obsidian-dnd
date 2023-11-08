import DnDPlugin from "../main";
import {data} from "../data";
import {WebBrowserView} from "./webBrowserView";

export function registerOpenAssociatedPageCommands(this: DnDPlugin) {
	for (const wiki of data.wikis) {
		this.addCommand({
			id: "open-associated-" + wiki.id + "-page",
			name: "Open associated page on " + wiki.displayName,
			checkCallback: (checking) => {
				const file = app.workspace.getActiveFile();
				if (file === null) return false;

				const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
				const page = <string | undefined>frontmatter?.[wiki.id];
				if (page === undefined) return false;

				if (!checking)
					WebBrowserView.spawnWebBrowserView(true, {
						trackingWikiID: wiki.id,
						url: wiki.pagePrefix + page
					}).then(/* no result */);

				return true;
			}
		});
	}
}
