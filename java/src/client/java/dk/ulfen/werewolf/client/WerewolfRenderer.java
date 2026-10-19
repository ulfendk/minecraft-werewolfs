package dk.ulfen.werewolf.client;

import com.geckolib.constant.dataticket.DataTicket;
import com.geckolib.model.DefaultedEntityGeoModel;
import com.geckolib.model.GeoModel;
import com.geckolib.renderer.GeoEntityRenderer;
import com.geckolib.renderer.base.GeoRenderState;

import dk.ulfen.werewolf.WerewolfRegistry;
import dk.ulfen.werewolf.entity.Werewolf;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.state.LivingEntityRenderState;
import net.minecraft.resources.Identifier;
import org.jspecify.annotations.Nullable;

/** Draws the wolf or the beast, whichever form the werewolf is in. */
public class WerewolfRenderer extends GeoEntityRenderer<Werewolf, LivingEntityRenderState> {
	static final DataTicket<Boolean> BEAST = DataTicket.create("werewolf_beast", Boolean.class);

	public WerewolfRenderer(EntityRendererProvider.Context context) {
		super(context, new FormModel());
		this.shadowRadius = 0.4F;
	}

	@Override
	public void captureDefaultRenderState(Werewolf animatable, @Nullable Void relatedObject, LivingEntityRenderState state, float partialTick) {
		super.captureDefaultRenderState(animatable, relatedObject, state, partialTick);
		state.addGeckolibData(BEAST, animatable.isBeast());
		this.shadowRadius = animatable.isBeast() ? 0.9F : 0.4F;
	}

	/** One GeckoLib model per form: geckolib/models/entity/{wolf,beast}.geo.json and so on. */
	private static class FormModel extends GeoModel<Werewolf> {
		private final DefaultedEntityGeoModel<Werewolf> wolf = new DefaultedEntityGeoModel<>(WerewolfRegistry.id("wolf"));
		private final DefaultedEntityGeoModel<Werewolf> beast = new DefaultedEntityGeoModel<>(WerewolfRegistry.id("beast"));

		private DefaultedEntityGeoModel<Werewolf> pick(GeoRenderState state) {
			return Boolean.TRUE.equals(state.getGeckolibData(BEAST)) ? beast : wolf;
		}

		@Override
		public Identifier getModelResource(GeoRenderState state) {
			return pick(state).getModelResource(state);
		}

		@Override
		public Identifier getTextureResource(GeoRenderState state) {
			return pick(state).getTextureResource(state);
		}

		@Override
		public Identifier getAnimationResource(Werewolf animatable) {
			return (animatable.isBeast() ? beast : wolf).getAnimationResource(animatable);
		}
	}
}
