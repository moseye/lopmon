import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'

export const ROLE_SIGNUP_PREFIX = 'rolesignup'

/** customId encodes the role id so the click handler is stateless across restarts. */
export function roleSignupRow(roleId: string): ActionRowBuilder<ButtonBuilder> {
  const button = new ButtonBuilder()
    .setCustomId(`${ROLE_SIGNUP_PREFIX}:${roleId}`)
    .setLabel('Toggle role')
    .setStyle(ButtonStyle.Primary)
  return new ActionRowBuilder<ButtonBuilder>().addComponents(button)
}
